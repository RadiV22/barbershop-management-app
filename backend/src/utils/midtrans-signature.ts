import "dotenv/config";
import { createHash, timingSafeEqual } from "node:crypto";

interface MidtransSignatureInput {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}

export function verifyMidtransSignature(
  input: MidtransSignatureInput,
): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();

  if (!serverKey) {
    throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi");
  }

  // SHA-512 dalam format hexadecimal memiliki 128 karakter.
  if (!/^[a-fA-F0-9]{128}$/.test(input.signature_key)) {
    return false;
  }

  const expectedSignature = createHash("sha512")
    .update(
      input.order_id + input.status_code + input.gross_amount + serverKey,
      "utf8",
    )
    .digest();

  const receivedSignature = Buffer.from(input.signature_key, "hex");

  return timingSafeEqual(expectedSignature, receivedSignature);
}
