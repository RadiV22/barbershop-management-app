import { z } from "zod";

export const createPaymentSchema = z.object({
  method: z.enum(["CASH", "TRANSFER", "QRIS", "CARD", "OTHER"]),

  amountReceived: z
    .number()
    .int("Uang diterima harus berupa bilangan bulat")
    .nonnegative("Uang diterima tidak boleh negatif")
    .refine(Number.isSafeInteger, {
      message: "Nominal uang di luar batas angka aman",
    }),
});
