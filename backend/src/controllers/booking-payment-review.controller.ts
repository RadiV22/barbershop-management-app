import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import {
  bookingPaymentParamsSchema,
  confirmBookingPaymentReviewSchema,
} from "../schemas/booking-payment.schema.js";
import { getMidtransTransactionStatus } from "../services/midtrans-status.service.js";
import { syncBookingPayment } from "../services/booking-payment-sync.service.js";
import {
  lockActiveKapster,
  findScheduleConflict,
} from "../services/schedule.service.js";
import {
  notifyBookingChanged,
  notifyAvailabilityChanged,
} from "../lib/socket.js";

export const checkBookingPayment = async (
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

    if (req.user.role !== "ADMIN" && req.user.role !== "STAFF") {
      return res.status(403).json({
        message: "Pemeriksaan pembayaran hanya untuk admin dan staff",
      });
    }

    const result = bookingPaymentParamsSchema.safeParse(req.params);

    if (!result.success) {
      return res.status(400).json({
        message: "ID pembayaran tidak valid",
      });
    }

    // ID di endpoint ini adalah ID BookingPayment, bukan ID Booking.
    const payment = await prisma.bookingPayment.findUnique({
      where: {
        id: result.data.id,
      },
    });

    if (!payment) {
      return res.status(404).json({
        message: "Transaksi pembayaran tidak ditemukan",
      });
    }

    let providerStatus;

    try {
      providerStatus = await getMidtransTransactionStatus(
        payment.merchantOrderId,
      );
    } catch {
      return res.status(503).json({
        message:
          "Status belum dapat diperoleh dari Midtrans. Transaksi mungkin belum tersedia atau layanan sedang bermasalah. Ini tidak berarti pembayaran gagal.",
      });
    }

    const expectedAmount = String(payment.amount);

    function matchesAmount(value: string): boolean {
      const [whole, fraction = ""] = value.split(".");

      return (
        whole === expectedAmount &&
        (fraction === "" || /^0{1,2}$/.test(fraction))
      );
    }

    if (
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

    const syncedPayment = await syncBookingPayment(
      payment.id,
      payment.updatedAt,
      providerStatus,
    );

    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({
      message: syncedPayment.needsReview
        ? "Status pembayaran sudah diperiksa, tetapi masih memerlukan penanganan pengelola."
        : "Status pembayaran berhasil diperiksa dan disinkronkan.",
      data: syncedPayment,
    });
  } catch (error) {
    next(error);
  }
};

export const confirmBookingPaymentReview = async (
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

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        message: "Persetujuan pemeriksaan hanya dapat dilakukan oleh admin",
      });
    }

    const paramsResult = bookingPaymentParamsSchema.safeParse(req.params);
    const bodyResult = confirmBookingPaymentReviewSchema.safeParse(req.body);

    if (!paramsResult.success) {
      return res.status(400).json({
        message: "ID pembayaran tidak valid",
      });
    }

    if (!bodyResult.success) {
      return res.status(400).json({
        message: "Alasan pemeriksaan tidak valid",
        errors: bodyResult.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const payment = await prisma.bookingPayment.findUnique({
      where: {
        id: paramsResult.data.id,
      },
      include: {
        booking: {
          include: {
            schedule: true,
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({
        message: "Transaksi pembayaran tidak ditemukan",
      });
    }

    if (payment.status !== "PAID" || !payment.needsReview) {
      return res.status(409).json({
        message:
          "Persetujuan ini hanya untuk pembayaran lunas yang membutuhkan pemeriksaan. Jalankan Periksa pembayaran terlebih dahulu.",
      });
    }

    // Pemeriksaan jaringan dilakukan sebelum transaksi database.
    let providerStatus;

    try {
      providerStatus = await getMidtransTransactionStatus(
        payment.merchantOrderId,
      );
    } catch {
      return res.status(503).json({
        message:
          "Status terbaru belum dapat diverifikasi ke Midtrans. Persetujuan belum dilakukan.",
      });
    }

    const [whole, fraction = ""] = providerStatus.gross_amount.split(".");

    const matchesAmount =
      whole === String(payment.amount) &&
      (fraction === "" || /^0{1,2}$/.test(fraction));

    if (
      !matchesAmount ||
      providerStatus.currency !== payment.currency ||
      payment.currency !== "IDR"
    ) {
      return res.status(409).json({
        message: "Nominal atau mata uang pembayaran tidak sesuai",
      });
    }

    if (
      payment.transactionId === null ||
      payment.transactionId !== providerStatus.transaction_id
    ) {
      return res.status(409).json({
        message:
          "Identitas transaksi belum sesuai. Jalankan Periksa pembayaran terlebih dahulu.",
      });
    }

    const isProviderPaid =
      (providerStatus.transaction_status === "settlement" &&
        (providerStatus.fraud_status === undefined ||
          providerStatus.fraud_status === "accept")) ||
      (providerStatus.transaction_status === "capture" &&
        providerStatus.fraud_status === "accept");

    if (!isProviderPaid) {
      return res.status(409).json({
        message:
          "Status terbaru Midtrans tidak memenuhi syarat persetujuan. Jalankan Periksa pembayaran untuk memperbarui data.",
      });
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
      const initialSchedule = payment.booking.schedule;

      // Urutan kunci sama dengan proses check-in.
      const customers = await tx.$queryRaw<{ id: number }[]>`
    SELECT "id"
    FROM "customers"
    WHERE "id" = ${initialSchedule.customerId}
      AND "deleted_at" IS NULL
    FOR UPDATE
  `;

      if (customers.length === 0) {
        return {
          success: false as const,
          statusCode: 409,
          message: "Customer sudah tidak tersedia.",
        };
      }

      const kapster = await lockActiveKapster(tx, initialSchedule.kapsterId);

      if (!kapster) {
        return {
          success: false as const,
          statusCode: 409,
          message: "Kapster sudah tidak tersedia.",
        };
      }

      await tx.$queryRaw`
    SELECT "id"
    FROM "bookings"
    WHERE "id" = ${payment.bookingId}
    FOR UPDATE
  `;

      const currentPayment = await tx.bookingPayment.findUnique({
        where: {
          id: payment.id,
        },
        include: {
          payment: true,
          booking: {
            include: {
              schedule: true,
            },
          },
        },
      });

      if (!currentPayment) {
        return {
          success: false as const,
          statusCode: 404,
          message: "Transaksi pembayaran tidak ditemukan.",
        };
      }

      if (currentPayment.updatedAt.getTime() !== payment.updatedAt.getTime()) {
        return {
          success: false as const,
          statusCode: 409,
          message:
            "Pembayaran berubah selama pemeriksaan. Muat ulang lalu coba kembali.",
        };
      }

      const schedule = currentPayment.booking.schedule;

      if (
        currentPayment.bookingId !== payment.bookingId ||
        schedule.id !== initialSchedule.id ||
        schedule.customerId !== initialSchedule.customerId ||
        schedule.kapsterId !== initialSchedule.kapsterId
      ) {
        return {
          success: false as const,
          statusCode: 409,
          message: "Data booking berubah. Muat ulang lalu coba kembali.",
        };
      }

      if (
        currentPayment.status !== "PAID" ||
        !currentPayment.needsReview ||
        currentPayment.paidAt === null
      ) {
        return {
          success: false as const,
          statusCode: 409,
          message: "Kondisi pembayaran tidak lagi memenuhi syarat pemeriksaan.",
        };
      }

      if (schedule.orderId !== null || currentPayment.payment !== null) {
        return {
          success: false as const,
          statusCode: 409,
          message:
            "Booking atau pembayaran sudah terhubung dengan order. Persetujuan jadwal tidak dapat dilakukan melalui fitur ini.",
        };
      }

      const now = new Date();

      if (
        schedule.source !== "ONLINE" ||
        !["HELD", "EXPIRED"].includes(schedule.status)
      ) {
        return {
          success: false as const,
          statusCode: 409,
          message: "Status jadwal tidak memenuhi syarat pemulihan booking.",
        };
      }

      if (schedule.startsAt.getTime() <= now.getTime()) {
        return {
          success: false as const,
          statusCode: 409,
          message:
            "Waktu booking sudah dimulai atau terlewati. Jadwal ini tidak dapat dikonfirmasi kembali.",
        };
      }

      if (
        schedule.endsAt.getTime() <= schedule.startsAt.getTime() ||
        schedule.blockedUntil.getTime() < schedule.endsAt.getTime()
      ) {
        return {
          success: false as const,
          statusCode: 409,
          message: "Rentang waktu jadwal tidak valid.",
        };
      }

      if (
        currentPayment.amount !== currentPayment.booking.total ||
        currentPayment.amount <= 0
      ) {
        return {
          success: false as const,
          statusCode: 409,
          message: "Nominal pembayaran tidak sesuai dengan total booking.",
        };
      }

      // Tolak apabila ada pembayaran lain yang juga berhasil,
      // pernah berhasil, atau masih membutuhkan pemeriksaan.
      const otherPayment = await tx.bookingPayment.findFirst({
        where: {
          bookingId: currentPayment.bookingId,
          id: {
            not: currentPayment.id,
          },
          OR: [
            { status: "PAID" },
            { paidAt: { not: null } },
            { needsReview: true },
          ],
        },
        select: {
          id: true,
        },
      });

      if (otherPayment) {
        return {
          success: false as const,
          statusCode: 409,
          message:
            "Booking memiliki transaksi lain yang perlu diperiksa sebelum jadwal dapat dikonfirmasi.",
        };
      }

      const unfinishedUnscheduledOrder = await tx.order.findFirst({
        where: {
          kapsterId: schedule.kapsterId,
          serviceStatus: {
            not: "COMPLETED",
          },
          schedule: {
            is: null,
          },
        },
        select: {
          id: true,
        },
      });

      if (unfinishedUnscheduledOrder) {
        return {
          success: false as const,
          statusCode: 409,
          message:
            "Kapster memiliki order belum selesai tanpa jadwal. Selesaikan pemeriksaan order tersebut dahulu.",
        };
      }

      // Samakan dengan aturan availability untuk layanan yang terlambat.
      const toWibDate = (value: Date) =>
        new Date(value.getTime() + 7 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);

      if (toWibDate(schedule.startsAt) === toWibDate(now)) {
        const overdueOrder = await tx.order.findFirst({
          where: {
            kapsterId: schedule.kapsterId,
            serviceStatus: "IN_SERVICE",
            schedule: {
              is: {
                endsAt: {
                  lte: now,
                },
              },
            },
          },
          select: {
            id: true,
          },
        });

        if (overdueOrder) {
          return {
            success: false as const,
            statusCode: 409,
            message:
              "Kapster masih menyelesaikan layanan yang melewati perkiraan waktu.",
          };
        }
      }

      const conflict = await findScheduleConflict(
        tx,
        schedule.kapsterId,
        schedule.startsAt,
        schedule.blockedUntil,
        now,
        schedule.id,
      );

      if (conflict) {
        return {
          success: false as const,
          statusCode: 409,
          message:
            "Jadwal sudah digunakan booking atau order lain. Persetujuan tidak dapat dilakukan.",
        };
      }

      // Semua pemeriksaan berhasil: simpan perubahan secara bersamaan.
      await tx.schedule.update({
        where: {
          id: schedule.id,
        },
        data: {
          status: "CONFIRMED",
          holdExpiresAt: null,
        },
      });

      await tx.bookingPaymentReview.create({
        data: {
          bookingPaymentId: currentPayment.id,
          reviewedById: req.user!.id,
          reason: bodyResult.data.reason,
          previousReason: currentPayment.reviewReason,
        },
      });

      await tx.bookingPayment.update({
        where: {
          id: currentPayment.id,
        },
        data: {
          needsReview: false,
          reviewReason: null,
          updatedAt: new Date(
            Math.max(Date.now(), currentPayment.updatedAt.getTime() + 1),
          ),
        },
      });

      return {
        success: true as const,
        bookingId: currentPayment.bookingId,
        paymentId: currentPayment.id,
      };
    });

    if (!transactionResult.success) {
      return res.status(transactionResult.statusCode).json({
        message: transactionResult.message,
      });
    }

    notifyBookingChanged(payment.booking.schedule.customerId);
    notifyAvailabilityChanged();

    return res.status(200).json({
      message:
        "Pemeriksaan disetujui. Booking berhasil dikonfirmasi dan alasan admin telah dicatat.",
      data: {
        bookingId: transactionResult.bookingId,
        paymentId: transactionResult.paymentId,
      },
    });
  } catch (error) {
    next(error);
  }
};
