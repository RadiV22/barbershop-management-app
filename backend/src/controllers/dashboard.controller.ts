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

    const [ordersToday, waitingOrders, inServiceOrders, paymentSummary] =
      await prisma.$transaction([
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

        prisma.payment.aggregate({
          where: {
            paidAt: {
              gte: startOfDay,
              lt: startOfNextDay,
            },
          },
          _sum: {
            amount: true,
          },
        }),
      ]);

    return res.status(200).json({
      message: "Ringkasan dashboard berhasil diambil",
      data: {
        date: nowWib.toISOString().slice(0, 10),
        timezone: "Asia/Jakarta",
        ordersToday,
        waitingOrders,
        inServiceOrders,
        revenueToday: paymentSummary._sum.amount ?? 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
