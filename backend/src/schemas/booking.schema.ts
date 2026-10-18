import { z } from "zod";
import { availabilityQuerySchema } from "./schedule.schema.js";
import { SCHEDULE_CONFIG } from "../config/schedule.config.js";

const MAX_INT = 2147483647;

const positiveIdSchema = z
  .number()
  .int("ID harus berupa bilangan bulat")
  .positive("ID harus lebih dari 0")
  .max(MAX_INT, "ID di luar batas yang diizinkan");

export const createBookingSchema = z
  .object({
    kapsterId: positiveIdSchema,

    serviceIds: z
      .array(positiveIdSchema)
      .min(1, "pilih minimal satu layanan")
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Layanan yang sama tidak boleh dipilih lebih dari sekali",
      }),

    quantities: z
      .array(
        z
          .number()
          .int("Jumlah layanan harus berupa bilangan bulat")
          .min(1, "Jumlah layanan minimal 1")
          .max(2147483647, "Jumlah layanan terlalu besar"),
      )
      .min(1, "Jumlah layanan wajib diisi"),

    date: availabilityQuerySchema.shape.date,

    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Jam harus menggunakan format HH:mm")
      .refine(
        (value) => {
          const [hours, minutes] = value.split(":").map(Number);
          const totalMinutes = hours * 60 + minutes;

          return (
            totalMinutes >= SCHEDULE_CONFIG.openingMinutes &&
            totalMinutes < SCHEDULE_CONFIG.closingMinutes &&
            (totalMinutes - SCHEDULE_CONFIG.openingMinutes) %
              SCHEDULE_CONFIG.slotIntervalMinutes ===
              0
          );
        },
        {
          message: `Pilih jam mulai dalam jam operasional dengan interval ${SCHEDULE_CONFIG.slotIntervalMinutes} menit`,
        },
      ),

    notes: z
      .string()
      .trim()
      .max(500, "Catatan maksimal 500 karakter")
      .optional(),
  })
  .refine((data) => data.serviceIds.length === data.quantities.length, {
    path: ["quantities"],
    message: "Jumlah pilihan layanan dan jumlah kuantitas harus sama",
  });

export const bookingParamsSchema = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d*$/, "ID booking harus berupa bilangan bulat positif")
    .transform(Number)
    .refine((value) => Number.isSafeInteger(value) && value <= 2147483647, {
      message: "ID booking berada di luar batas yang diperbolehkan",
    }),
});
