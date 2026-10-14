import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { bookingPaymentParamsSchema } from "../schemas/booking-payment.schema.js";
import { snap } from "../lib/midtrans.js";
import {
  prepareBookingPayment,
  buildBookingPaymentParameters,
} from "../services/booking-payment.service.js";

export const createBookingPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Anda belum terautentikasi",
      });
    }

    if (req.user.role !== "CUSTOMER") {
      return res.status(403).json({
        message: "Pembayaran booking hanya tersedia untuk customer",
      });
    }

    const result = bookingPaymentParamsSchema.safeParse(req.params);

    if (!result.success) {
      return res.status(400).json({
        message: "ID booking tidak valid",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const bookingId = result.data.id;

    // Cari booking yang memang dimiliki akun customer ini.
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        schedule: {
          customer: {
            userId: req.user.id,
            deletedAt: null,
          },
        },
      },
      include: {
        schedule: true,
      },
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking tidak ditemukan",
      });
    }

    const paidPayment = await prisma.bookingPayment.findFirst({
      where: {
        bookingId: booking.id,
        status: "PAID",
      },
      select: {
        id: true,
      },
    });

    if (paidPayment) {
      return res.status(409).json({
        message: "Booking sudah dibayar",
      });
    }

    if (booking.schedule.status !== "HELD") {
      return res.status(409).json({
        message: "Status booking tidak memungkinkan pembayaran",
      });
    }

    const now = new Date();
    const holdExpiresAt = booking.schedule.holdExpiresAt;

    if (
      !holdExpiresAt ||
      holdExpiresAt.getTime() <= now.getTime() ||
      booking.schedule.startsAt.getTime() <= now.getTime()
    ) {
      return res.status(409).json({
        message:
          "Batas pembayaran atau waktu booking sudah terlewati. Silakan buat booking baru.",
      });
    }

    if (!Number.isSafeInteger(booking.total) || booking.total <= 0) {
      return res.status(409).json({
        message:
          "Nominal booking tidak dapat diproses melalui pembayaran online. Silakan hubungi barbershop.",
      });
    }

    const preparation = await prepareBookingPayment(booking.id, req.user.id);

    if (!preparation.success) {
      return res.status(preparation.statusCode).json({
        message: preparation.message,
      });
    }

    const payment = preparation.payment;

    if (
      payment.needsReview ||
      !["CREATED", "PENDING"].includes(payment.status)
    ) {
      return res.status(409).json({
        message:
          "Transaksi pembayaran tidak dapat dilanjutkan. Silakan perbarui pesanan atau hubungi barbershop.",
      });
    }

    if (payment.expiresAt.getTime() <= Date.now()) {
      return res.status(409).json({
        message: "Batas pembayaran sudah terlewati.",
      });
    }

    // Gunakan transaksi lama apabila token sudah tersimpan.
    if (!preparation.isNew) {
      if (payment.snapToken && payment.redirectUrl) {
        res.setHeader("Cache-Control", "no-store");

        return res.status(200).json({
          message: "Transaksi pembayaran sebelumnya tersedia",
          data: {
            bookingId: payment.bookingId,
            merchantOrderId: payment.merchantOrderId,
            amount: payment.amount,
            snapToken: payment.snapToken,
            redirectUrl: payment.redirectUrl,
            expiresAt: payment.expiresAt,
          },
        });
      }

      return res.status(409).json({
        message:
          "Transaksi pembayaran sedang disiapkan atau hasilnya belum dapat dipastikan. Tunggu sebentar lalu coba lagi. Jika tetap sama, hubungi barbershop.",
      });
    }

    const parameters = buildBookingPaymentParameters({
      merchantOrderId: payment.merchantOrderId,
      amount: payment.amount,
      expiresAt: payment.expiresAt,
    });

    let transaction: {
      token: string;
      redirect_url: string;
    };

    try {
      // Permintaan jaringan dilakukan setelah transaksi database selesai.
      transaction = await snap.createTransaction(parameters);

      if (!transaction.token || !transaction.redirect_url) {
        throw new Error("Respons transaksi Midtrans tidak lengkap");
      }
    } catch {
      // Jangan langsung menganggap transaksi gagal:
      // Midtrans mungkin sudah menerima permintaan.
      return res.status(502).json({
        message:
          "Hasil pembuatan transaksi belum dapat dipastikan. Jangan membuat pembayaran lain untuk booking ini. Silakan coba kembali setelah beberapa saat atau hubungi barbershop.",
      });
    }

    // Simpan token tanpa mengubah status pembayaran menjadi PAID.
    const savedPayment = await prisma.bookingPayment.update({
      where: {
        id: payment.id,
      },
      data: {
        snapToken: transaction.token,
        redirectUrl: transaction.redirect_url,
      },
    });

    // Permintaan ke Midtrans mungkin memerlukan waktu.
    if (savedPayment.expiresAt.getTime() <= Date.now()) {
      return res.status(409).json({
        message:
          "Batas pembayaran terlewati saat transaksi disiapkan. Silakan perbarui pesanan.",
      });
    }

    res.setHeader("Cache-Control", "no-store");

    return res.status(201).json({
      message: "Transaksi pembayaran berhasil disiapkan",
      data: {
        bookingId: savedPayment.bookingId,
        merchantOrderId: savedPayment.merchantOrderId,
        amount: savedPayment.amount,
        snapToken: savedPayment.snapToken,
        redirectUrl: savedPayment.redirectUrl,
        expiresAt: savedPayment.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
