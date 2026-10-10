import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { availabilityQuerySchema } from "../schemas/schedule.schema.js";
import { SCHEDULE_CONFIG } from "../config/schedule.config.js";
import {
  addMinutes,
  isTimeOverlapping,
  parseWibDate,
} from "../utils/schedule.utils.js";
import { number } from "zod";

export const getAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = availabilityQuerySchema.safeParse(req.query);

    if (!result.success) {
      return res.status(400).json({
        message: "Data pencarian jadwal tidak valid",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { date, kapsterId, serviceIds } = result.data;

    const kapster = await prisma.kapster.findUnique({
      where: { id: kapsterId },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    if (!kapster || !kapster.isActive) {
      return res.status(404).json({
        message: "Kapster tidak ditemukan atau sedang tidak aktif",
      });
    }

    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        isActive: true,
      },
      select: {
        id: true,
        duration: true,
      },
    });

    if (services.length !== serviceIds.length) {
      return res.status(409).json({
        message: "Ada layanan yang tidak ditemukan atau sudah tidak aktif",
      });
    }

    const totalDuration = services.reduce(
      (total, service) => total + service.duration,
      0,
    );

    if (
      !Number.isSafeInteger(totalDuration) ||
      services.some((service) => service.duration <= 0)
    ) {
      return res.status(409).json({
        message: "Durasi layanan tidak valid. hubungi pengelola.",
      });
    }

    const unscheduledOrder = await prisma.order.findFirst({
      where: {
        kapsterId,
        serviceStatus: { not: "COMPLETED" },
        schedule: { is: null },
      },
      select: { id: true },
    });

    if (unscheduledOrder) {
      return res.status(409).json({
        message:
          "ketersediaan kapster belum dapat diposisikan karena ada order aktif yang belum memiliki jadwal.",
      });
    }

    const dayStart = parseWibDate(date);

    if (!dayStart) {
      return res.status(400).json({
        message: "tanggal tidak valid",
      });
    }

    const openingAt = addMinutes(dayStart, SCHEDULE_CONFIG.openingMinutes);

    const closingAt = addMinutes(dayStart, SCHEDULE_CONFIG.closingMinutes);

    const now = new Date();

    // Tentukan tanggal hari ini dalam WIB.
    const todayWib = new Date(
      now.getTime() + SCHEDULE_CONFIG.utcOffsetMinutes * 60 * 1000,
    )
      .toISOString()
      .slice(0, 10);

    // Pemeriksaan keterlambatan ini berlaku untuk booking hari ini.
    if (date === todayWib) {
      const overdueOrder = await prisma.order.findFirst({
        where: {
          kapsterId,
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
        res.setHeader("Cache-Control", "no-store");

        return res.status(409).json({
          message:
            "Kapster masih menyelesaikan layanan yang melewati perkiraan waktu. Jadwal hari ini sementara belum tersedia. Silakan coba kembali nanti atau pilih kapster lain.",
        });
      }
    }

    const schedules = await prisma.schedule.findMany({
      where: {
        kapsterId,

        startsAt: { lt: closingAt },
        blockedUntil: { gt: openingAt },

        OR: [
          {
            status: {
              in: ["CONFIRMED", "COMPLETED"],
            },
          },
          {
            status: "HELD",
            holdExpiresAt: { gt: now },
          },
          {
            // HELD tanpa batas waktu dianggap menghalangi
            // sampai datanya diperbaiki.
            status: "HELD",
            holdExpiresAt: null,
          },
        ],
      },
      select: {
        startsAt: true,
        blockedUntil: true,
      },
    });
    const slots: {
      time: string;
      startsAt: string;
      endsAt: string;
      blockedUntil: string;
    }[] = [];

    for (
      let minute = SCHEDULE_CONFIG.openingMinutes;
      minute < SCHEDULE_CONFIG.closingMinutes;
      minute += SCHEDULE_CONFIG.slotIntervalMinutes
    ) {
      const startsAt = addMinutes(dayStart, minute);
      const endsAt = addMinutes(startsAt, totalDuration);
      const blockedUntil = addMinutes(endsAt, SCHEDULE_CONFIG.bufferMinutes);

      // Tidak menawarkan waktu yang sudah lewat.
      if (startsAt.getTime() <= now.getTime()) {
        continue;
      }

      // Layanan dan jedanya harus selesai sebelum atau saat tutup.
      if (blockedUntil.getTime() > closingAt.getTime()) {
        continue;
      }

      const hasConflict = schedules.some((schedule) =>
        isTimeOverlapping(
          startsAt,
          blockedUntil,
          schedule.startsAt,
          schedule.blockedUntil,
        ),
      );

      if (hasConflict) {
        continue;
      }

      const hours = String(Math.floor(minute / 60)).padStart(2, "0");
      const minutes = String(minute % 60).padStart(2, "0");

      slots.push({
        time: `${hours}:${minutes}`,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        blockedUntil: blockedUntil.toISOString(),
      });
    }

    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({
      message: "Jadwal tersedia berhasil diambil",
      data: {
        date,
        timezone: SCHEDULE_CONFIG.timezone,
        kapster: {
          id: kapster.id,
          name: kapster.name,
        },
        totalDuration,
        bufferMinutes: SCHEDULE_CONFIG.bufferMinutes,
        slots,
      },
    });
  } catch (error) {
    next(error);
  }
};
