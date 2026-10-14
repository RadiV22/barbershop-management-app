import { z } from "zod";

export const midtransNotificationSchema = z.object({
  order_id: z.string().min(1).max(255),

  status_code: z.string().regex(/^\d{3}$/, "Kode status Midtrans tidak valid"),

  gross_amount: z
    .string()
    .regex(/^\d+(?:\.\d{1,2})?$/, "Nominal pembayaran tidak valid"),

  signature_key: z
    .string()
    .regex(/^[a-fA-F0-9]{128}$/, "Format tanda tangan Midtrans tidak valid"),
});
