import "dotenv/config";
import { z } from "zod";

const midtransStatusSchema = z.object({
  order_id: z.string().min(1),
  transaction_id: z.string().min(1),
  transaction_status: z.string().min(1),
  payment_type: z.string().min(1),

  gross_amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
  currency: z.string().min(1),

  fraud_status: z.string().optional(),
  transaction_time: z.string().optional(),
  settlement_time: z.string().optional(),
});

export async function getMidtransTransactionStatus(merchantOrderId: string) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();

  if (!serverKey) {
    throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi");
  }

  if (process.env.MIDTRANS_IS_PRODUCTION !== "false") {
    throw new Error("Pemeriksaan status ini masih khusus Sandbox");
  }

  const authorization = Buffer.from(`${serverKey}:`, "utf8").toString("base64");

  const response = await fetch(
    `https://api.sandbox.midtrans.com/v2/${encodeURIComponent(
      merchantOrderId,
    )}/status`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${authorization}`,
      },
      signal: AbortSignal.timeout(10000),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Pemeriksaan status Midtrans gagal: HTTP ${response.status}`,
    );
  }

  const body: unknown = await response.json();
  const result = midtransStatusSchema.safeParse(body);

  if (!result.success) {
    throw new Error("Respons status Midtrans tidak lengkap atau tidak valid");
  }

  if (result.data.order_id !== merchantOrderId) {
    throw new Error("Identitas transaksi Midtrans tidak sesuai");
  }

  return result.data;
}
