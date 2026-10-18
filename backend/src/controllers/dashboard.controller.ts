import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";

export const getDashboardSummary = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Tentukan tanggal hari ini dalam WIB.
    const now = new Date();
    const wibOffset = 7 * 60 * 60 * 1000;
    const nowWib = new Date(now.getTime() + wibOffset);

    // Ubah batas awal hari WIB menjadi waktu UTC untuk query.
    const startOfDay = new Date(
      Date.UTC(
        nowWib.getUTCFullYear(),
        nowWib.getUTCMonth(),
        nowWib.getUTCDate(),
      ) - wibOffset,
    );

    const startOfNextDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Awal bulan dan awal bulan berikutnya dalam WIB, diubah menjadi UTC.
    const startOfMonth = new Date(
      Date.UTC(nowWib.getUTCFullYear(), nowWib.getUTCMonth(), 1) - wibOffset,
    );

    const startOfNextMonth = new Date(
      Date.UTC(nowWib.getUTCFullYear(), nowWib.getUTCMonth() + 1, 1) -
        wibOffset,
    );

    const [
      ordersToday,
      waitingOrders,
      inServiceOrders,
      cashierPaymentSummary,
      bookingPaymentSummary,
      cashierMonthlySummary,
      bookingMonthlySummary,
      cashierTotalSummary,
      bookingTotalSummary,
    ] = await prisma.$transaction([
      prisma.order.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lt: startOfNextDay,
          },
        },
      }),

      prisma.order.count({
        where: {
          serviceStatus: "WAITING",
        },
      }),

      prisma.order.count({
        where: {
          serviceStatus: "IN_SERVICE",
        },
      }),

      // Pembayaran langsung di kasir.
      // Salinan pembayaran dari booking tidak dihitung di sini.
      prisma.payment.aggregate({
        where: {
          bookingPaymentId: null,
          paidAt: {
            gte: startOfDay,
            lt: startOfNextDay,
          },
        },
        _sum: {
          amount: true,
        },
      }),

      // Pembayaran online dihitung dari transaksi booking asalnya.
      prisma.bookingPayment.aggregate({
        where: {
          status: "PAID",
          currency: "IDR",
          paidAt: {
            gte: startOfDay,
            lt: startOfNextDay,
          },
        },
        _sum: {
          amount: true,
        },
      }),

      // Pendapatan kasir bulan ini.
      prisma.payment.aggregate({
        where: {
          bookingPaymentId: null,
          paidAt: {
            gte: startOfMonth,
            lt: startOfNextMonth,
          },
        },
        _sum: {
          amount: true,
        },
      }),

      // Pendapatan booking online bulan ini.
      prisma.bookingPayment.aggregate({
        where: {
          status: "PAID",
          currency: "IDR",
          paidAt: {
            gte: startOfMonth,
            lt: startOfNextMonth,
          },
        },
        _sum: {
          amount: true,
        },
      }),

      // Seluruh pendapatan kasir.
      prisma.payment.aggregate({
        where: {
          bookingPaymentId: null,
        },
        _sum: {
          amount: true,
        },
      }),

      // Seluruh pendapatan booking online.
      prisma.bookingPayment.aggregate({
        where: {
          status: "PAID",
          currency: "IDR",
          paidAt: {
            not: null,
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const revenueToday =
      (cashierPaymentSummary._sum.amount ?? 0) +
      (bookingPaymentSummary._sum.amount ?? 0);

    const revenueThisMonth =
      (cashierMonthlySummary._sum.amount ?? 0) +
      (bookingMonthlySummary._sum.amount ?? 0);

    const revenueTotal =
      (cashierTotalSummary._sum.amount ?? 0) +
      (bookingTotalSummary._sum.amount ?? 0);

    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({
      message: "Ringkasan dashboard berhasil diambil",
      data: {
        date: nowWib.toISOString().slice(0, 10),
        timezone: "Asia/Jakarta",
        ordersToday,
        waitingOrders,
        inServiceOrders,
        revenueToday,
        revenueThisMonth,
        revenueTotal,
      },
    });
  } catch (error) {
    next(error);
  }
};
