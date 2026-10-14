import "dotenv/config";
import midtransClient from "midtrans-client";

const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();

if (!serverKey) {
  throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi");
}

if (process.env.MIDTRANS_IS_PRODUCTION !== "false") {
  throw new Error("Untuk tahap pengujian, MIDTRANS_IS_PRODUCTION harus false");
}

export const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey,
  clientKey: "",
});
