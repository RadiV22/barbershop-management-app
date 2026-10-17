import { z } from "zod";

export const bookingNoShowParamsSchema = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d*$/, "ID booking harus berupa bilangan bulat positif")
    .transform(Number)
    .refine(
      (value) => Number.isSafeInteger(value) && value <= 2147483647,
      "ID booking tidak valid",
    ),
});

export const bookingNoShowBodySchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Alasan minimal 5 karakter")
    .max(500, "Alasan maksimal 500 karakter"),
});
