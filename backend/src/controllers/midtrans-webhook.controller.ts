import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { midtransNotificationSchema } from "../schemas/midtrans-notification.schema.js";
import { verifyMidtransSignature } from "../utils/midtrans-signature.js";
import { getMidtransTransactionStatus } from "../services/midtrans-status.service.js";
import { syncBookingPayment } from "../services/booking-payment-sync.service.js";

export const handleMidtransNotification = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = midtransNotificationSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Format notifikasi pembayaran tidak valid",
      });
    }

    const notification = result.data;

    if (!verifyMidtransSignature(notification)) {
      return res.status(403).json({
        message: "Tanda tangan notifikasi tidak valid",
      });
    }

    const payment = await prisma.bookingPayment.findUnique({
      where: {
        merchantOrderId: notification.order_id,
      },
    });

    if (!payment) {
      return res.status(404).json({
        message: "Transaksi pembayaran tidak ditemukan",
      });
    }

    // Ambil status langsung dari Midtrans.
    let providerStatus;

    try {
      providerStatus = await getMidtransTransactionStatus(
        payment.merchantOrderId,
      );
    } catch {
      return res.status(503).json({
        message: "Status pembayaran belum dapat diverifikasi",
      });
    }

    // Bandingkan nominal sebagai teks agar tidak kehilangan presisi.
    const expectedAmount = String(payment.amount);

    function matchesAmount(value: string): boolean {
      const [whole, fraction = ""] = value.split(".");

      return (
        whole === expectedAmount &&
        (fraction === "" || /^0{1,2}$/.test(fraction))
      );
    }

    if (
      !matchesAmount(notification.gross_amount) ||
      !matchesAmount(providerStatus.gross_amount) ||
      providerStatus.currency !== payment.currency
    ) {
      return res.status(409).json({
        message: "Nominal atau mata uang pembayaran tidak sesuai",
      });
    }

    if (
      payment.transactionId !== null &&
      payment.transactionId !== providerStatus.transaction_id
    ) {
      return res.status(409).json({
        message: "Identitas transaksi pembayaran tidak sesuai",
      });
    }

    await syncBookingPayment(payment.id, payment.updatedAt, providerStatus);

    return res.status(200).json({
      message: "Notifikasi pembayaran berhasil diproses",
    });
  } catch (error) {
    next(error);
  }
};
