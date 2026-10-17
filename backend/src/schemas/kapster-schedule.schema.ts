import { z } from "zod";

export const kapsterScheduleParamsSchema = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d*$/, "ID kapster harus berupa bilangan bulat positif")
    .transform(Number)
    .refine(
      (value) => Number.isSafeInteger(value) && value <= 2147483647,
      "ID kapster tidak valid",
    ),
});

export const kapsterScheduleQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
    .optional(),
});
