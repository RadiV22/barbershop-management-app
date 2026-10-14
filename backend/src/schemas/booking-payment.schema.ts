import { z } from "zod";

export const bookingPaymentParamsSchema = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d*$/, "ID booking harus berupa bilangan bulat positif")
    .transform(Number)
    .refine((value) => Number.isSafeInteger(value) && value <= 2147483647, {
      message: "ID booking berada di luar batas yang diizinkan",
    }),
});

export const confirmBookingPaymentReviewSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Alasan pemeriksaan minimal 10 karakter")
    .max(500, "Alasan pemeriksaan maksimal 500 karakter"),
});
