import { z } from "zod";
import { SCHEDULE_CONFIG } from "../config/schedule.config.js";
import { getTodayWib, parseWibDate } from "../utils/schedule.utils.js";

const MAX_INT = 2147483647;
const DAY_MS = 24 * 60 * 60 * 1000;

function isValidId(value: string): boolean {
  if (!/^[1-9]\d*$/.test(value)) {
    return false;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) && id <= MAX_INT;
}

export const availabilityQuerySchema = z.object({
  date: z
    .string()
    .refine((value) => parseWibDate(value) !== null, {
      message: "Tanggal harus valid dengan format YYYY-MM-DD",
    })
    .refine(
      (value) => {
        const selectedDate = parseWibDate(value);

        // Tanggal tidak valid sudah ditangani pemeriksaan sebelumnya.
        if (!selectedDate) {
          return true;
        }

        const today = parseWibDate(getTodayWib());

        if (!today) {
          return false;
        }

        const latestDate =
          today.getTime() + SCHEDULE_CONFIG.maxAdvanceDays * DAY_MS;

        return (
          selectedDate.getTime() >= today.getTime() &&
          selectedDate.getTime() <= latestDate
        );
      },
      {
        message: "Tanggal booking hanya boleh hari ini sampai 7 hari ke depan",
      },
    ),

  kapsterId: z
    .string()
    .refine(isValidId, {
      message: "ID kapster harus berupa bilangan bulat positif yang valid",
    })
    .transform(Number),

  serviceIds: z
    .string()
    .refine((value) => value.split(",").every(isValidId), {
      message: "Pilih minimal satu layanan dengan ID valid, dipisahkan koma",
    })
    .transform((value) => [...new Set(value.split(",").map(Number))]),
});
