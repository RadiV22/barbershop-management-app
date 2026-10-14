import prisma from "../lib/prisma.js";
import { getMidtransTransactionStatus } from "./midtrans-status.service.js";
import { findScheduleConflict } from "./schedule.service.js";
import { mapMidtransPaymentStatus } from "../utils/midtrans-payment-status.js";
import { parseMidtransTime } from "../utils/midtrans-time.utils.js";
import { notifyBookingChanged } from "../lib/socket.js";

type MidtransStatus = Awaited<ReturnType<typeof getMidtransTransactionStatus>>;

export async function syncBookingPayment(
  paymentId: number,
  expectedUpdatedAt: Date,
  provider: MidtransStatus,
) {
  // Ambil identitas kapster untuk menentukan kunci transaksi.
  const initialPayment = await prisma.bookingPayment.findUnique({
    where: { id: paymentId },
    include: {
      booking: {
        include: { schedule: true },
      },
    },
  });

  if (!initialPayment) {
    throw new Error("Transaksi pembayaran tidak ditemukan");
  }

  const kapsterId = initialPayment.booking.schedule.kapsterId;

  const syncResult = await prisma.$transaction(async (tx) => {
    // Gunakan kunci kapster yang sama dengan proses pembuatan jadwal.
    const kapsters = await tx.$queryRaw<{ id: number; isActive: boolean }[]>`
      SELECT "id", "is_active" AS "isActive"
      FROM "kapsters"
      WHERE "id" = ${kapsterId}
      FOR UPDATE
    `;

    if (!kapsters[0]) {
      throw new Error("Kapster tidak ditemukan");
    }

    // Gunakan kunci booking yang sama dengan persiapan pembayaran.
    await tx.$queryRaw`
      SELECT "id"
      FROM "bookings"
      WHERE "id" = ${initialPayment.bookingId}
      FOR UPDATE
    `;

    const payment = await tx.bookingPayment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            schedule: {
              include: { customer: true },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new Error("Transaksi pembayaran tidak ditemukan");
    }

    // Hasil pemeriksaan di luar transaksi tidak boleh menimpa
    // perubahan yang terjadi setelah pemeriksaan dimulai.
    if (payment.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      throw new Error(
        "Pembayaran berubah selama verifikasi. Notifikasi perlu diproses ulang.",
      );
    }

    const schedule = payment.booking.schedule;

    if (schedule.kapsterId !== kapsterId) {
      throw new Error("Kapster booking berubah selama verifikasi");
    }

    const mapped = mapMidtransPaymentStatus(
      provider.transaction_status,
      provider.fraud_status,
    );

    const now = new Date();

    let paidAt = payment.paidAt;

    if (paidAt === null && mapped.status === "PAID") {
      if (
        provider.transaction_status === "settlement" &&
        provider.payment_type === "bank_transfer"
      ) {
        if (!provider.settlement_time) {
          throw new Error(
            "Waktu settlement pembayaran VA belum tersedia dari Midtrans",
          );
        }

        paidAt = parseMidtransTime(provider.settlement_time);
      } else {
        // Sementara mempertahankan perilaku metode selain VA.
        // Waktu keberhasilan metode lain akan ditangani terpisah.
        paidAt = now;
      }
    }

    let status = mapped.status;
    let needsReview = payment.needsReview || mapped.needsReview;
    let reviewReason = mapped.reviewReason ?? payment.reviewReason;

    function flagReview(reason: string) {
      needsReview = true;
      reviewReason = reason;
    }

    const wasPaid = payment.paidAt !== null;

    if (mapped.status === "PAID") {
      if (!wasPaid) {
        const deadline = schedule.holdExpiresAt;

        if (
          payment.needsReview ||
          !["CREATED", "PENDING"].includes(payment.status)
        ) {
          flagReview(
            "Pembayaran berhasil setelah transaksi memiliki kondisi yang perlu diperiksa.",
          );
        } else if (
          schedule.status !== "HELD" ||
          !deadline ||
          deadline.getTime() <= now.getTime() ||
          payment.expiresAt.getTime() <= now.getTime() ||
          schedule.startsAt.getTime() <= now.getTime()
        ) {
          flagReview(
            "Pembayaran berhasil, tetapi jadwal atau batas pembayaran sudah tidak berlaku saat diverifikasi.",
          );
        } else if (
          !kapsters[0].isActive ||
          schedule.customer.deletedAt !== null
        ) {
          flagReview(
            "Pembayaran berhasil, tetapi kapster atau customer sudah tidak tersedia.",
          );
        } else {
          const conflict = await findScheduleConflict(
            tx,
            schedule.kapsterId,
            schedule.startsAt,
            schedule.blockedUntil,
            now,
            schedule.id,
          );

          if (conflict) {
            flagReview(
              "Pembayaran berhasil, tetapi jadwal berbenturan dengan jadwal lain.",
            );
          } else {
            await tx.schedule.update({
              where: { id: schedule.id },
              data: {
                status: "CONFIRMED",
                holdExpiresAt: null,
              },
            });
          }
        }
      } else if (payment.status !== "PAID") {
        // Jangan otomatis mengembalikan refund/review menjadi PAID.
        status = payment.status;

        flagReview(
          "Status berhasil diterima setelah pembayaran memiliki status lanjutan. Periksa transaksi.",
        );
      }
    } else if (wasPaid) {
      if (
        mapped.status === "REFUNDED" ||
        mapped.status === "PARTIALLY_REFUNDED"
      ) {
        flagReview(mapped.reviewReason ?? "Periksa pengembalian pembayaran.");
      } else {
        // Status tak terduga setelah lunas tidak membatalkan
        // jadwal secara otomatis.
        status = payment.status;

        flagReview(
          `Pembayaran pernah berhasil, tetapi status Midtrans sekarang ${provider.transaction_status}.`,
        );
      }
    } else if (
      !["CREATED", "PENDING"].includes(payment.status) &&
      mapped.status === "PENDING"
    ) {
      status = payment.status;

      flagReview(
        "Status pending diterima setelah pembayaran memiliki status lanjutan.",
      );
    } else if (["EXPIRED", "CANCELLED", "FAILED"].includes(mapped.status)) {
      if (schedule.status === "HELD") {
        await tx.schedule.update({
          where: { id: schedule.id },
          data: {
            status: mapped.status === "EXPIRED" ? "EXPIRED" : "CANCELLED",
            holdExpiresAt: null,
          },
        });
      } else if (
        schedule.status === "CONFIRMED" ||
        schedule.status === "COMPLETED"
      ) {
        flagReview(
          "Pembayaran tidak berhasil, tetapi jadwal sudah dikonfirmasi atau selesai.",
        );
      }
    }

    const updatedPayment = await tx.bookingPayment.update({
      where: { id: payment.id },
      data: {
        status,
        transactionId: provider.transaction_id,
        providerStatus: provider.transaction_status,
        paymentType: provider.payment_type,
        fraudStatus: provider.fraud_status ?? null,
        needsReview,
        reviewReason,

        paidAt,

        // Pastikan versi berubah meskipun diproses pada milidetik sama.
        updatedAt: new Date(
          Math.max(now.getTime(), payment.updatedAt.getTime() + 1),
        ),
      },
    });

    return {
      paymentId: updatedPayment.id,
      status: updatedPayment.status,
      needsReview: updatedPayment.needsReview,
    };
  });

  notifyBookingChanged(initialPayment.booking.schedule.customerId);

  return syncResult;
}
