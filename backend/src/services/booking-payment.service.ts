import { randomUUID } from "node:crypto";
import prisma from "../lib/prisma.js";

interface BookingPaymentInput {
  merchantOrderId: string;
  amount: number;
  expiresAt: Date;
}

function formatMidtransTime(date: Date): string {
  const wibDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);

  return `${wibDate.toISOString().slice(0, 19).replace("T", " ")} +0700`;
}

export function buildBookingPaymentParameters(input: BookingPaymentInput) {
  // Tetapkan titik awal agar expiry berakhir pada batas booking.
  const expiryStart = new Date(input.expiresAt.getTime() - 15 * 60 * 1000);

  return {
    transaction_details: {
      order_id: input.merchantOrderId,
      gross_amount: input.amount,
    },

    expiry: {
      start_time: formatMidtransTime(expiryStart),
      unit: "minutes",
      duration: 15,
    },

    credit_card: {
      secure: true,
    },
  };
}

export async function prepareBookingPayment(bookingId: number, userId: number) {
  return prisma.$transaction(async (tx) => {
    // Permintaan untuk booking yang sama harus diproses bergantian.
    await tx.$queryRaw`
      SELECT "id"
      FROM "bookings"
      WHERE "id" = ${bookingId}
      FOR UPDATE
    `;

    // Periksa ulang kepemilikan setelah mendapatkan kunci.
    const booking = await tx.booking.findFirst({
      where: {
        id: bookingId,
        schedule: {
          customer: {
            userId,
            deletedAt: null,
          },
        },
      },
      include: {
        schedule: true,
      },
    });

    if (!booking) {
      return {
        success: false as const,
        statusCode: 404,
        message: "Booking tidak ditemukan",
      };
    }

    const existingPayment = await tx.bookingPayment.findFirst({
      where: {
        bookingId,
      },
      orderBy: {
        id: "desc",
      },
    });

    // Jangan membuat transaksi baru sebelum transaksi lama diperiksa.
    if (existingPayment) {
      return {
        success: true as const,
        isNew: false,
        payment: existingPayment,
      };
    }

    const now = new Date();
    const expiresAt = booking.schedule.holdExpiresAt;

    if (
      booking.schedule.status !== "HELD" ||
      !expiresAt ||
      expiresAt.getTime() <= now.getTime() ||
      booking.schedule.startsAt.getTime() <= now.getTime()
    ) {
      return {
        success: false as const,
        statusCode: 409,
        message: "Booking sudah tidak tersedia untuk pembayaran.",
      };
    }

    if (!Number.isSafeInteger(booking.total) || booking.total <= 0) {
      return {
        success: false as const,
        statusCode: 409,
        message: "Nominal booking tidak valid untuk pembayaran online.",
      };
    }

    const payment = await tx.bookingPayment.create({
      data: {
        bookingId: booking.id,
        merchantOrderId: `BOOKING-${booking.id}-${randomUUID()}`,
        amount: booking.total,
        currency: "IDR",
        status: "CREATED",
        expiresAt,
      },
    });

    return {
      success: true as const,
      isNew: true,
      payment,
    };
  });
}
