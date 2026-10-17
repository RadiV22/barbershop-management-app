import type { NextFunction, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import {
  createKapsterSchema,
  updateKapsterSchema,
} from "../schemas/kapster.schema.js";
import {
  kapsterScheduleParamsSchema,
  kapsterScheduleQuerySchema,
} from "../schemas/kapster-schedule.schema.js";

export const createKapster = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = createKapsterSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Data kapster tidak valid",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { name } = req.body ?? {};

    if (typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({
        message: "Nama Kapster wajib diisi",
      });
    }

    const newKapster = await prisma.kapster.create({
      data: {
        name: name.trim(),
      },
    });

    return res.status(201).json({
      message: "Kapster berhasil didaftarkan",
      data: newKapster,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllKapster = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const kapsterList = await prisma.kapster.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return res.status(200).json({
      message: "Daftar Kapster berhasil diambil",
      data: kapsterList,
    });
  } catch (error) {
    next(error);
  }
};

export const getKapsterById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const kapsterId = Number(req.params.id);

    if (!Number.isInteger(kapsterId) || kapsterId <= 0) {
      return res.status(400).json({
        message: "ID Kapster harus berupa bilangan bulat positif",
      });
    }

    const kapster = await prisma.kapster.findUnique({
      where: {
        id: kapsterId,
      },
    });

    if (!kapster) {
      return res.status(404).json({
        message: "kapster tidak ditemukan",
      });
    }

    return res.status(200).json({
      message: "kapster berhasil diambil",
      data: kapster,
    });
  } catch (error) {
    next(error);
  }
};

export const updateKapster = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = updateKapsterSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Data kapster tidak valid",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const kapsterId = Number(req.params.id);

    if (!Number.isInteger(kapsterId) || kapsterId <= 0) {
      return res.status(400).json({
        message: "ID Kapster harus berupa bilangan bulat positif",
      });
    }

    const { name, isActive } = result.data;

    const updateData: {
      name?: string;
      isActive?: boolean;
    } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return res.status(400).json({
          message: "Nama Kapster harus berupa teks dan tidak boleh kosong",
        });
      }

      updateData.name = name.trim();
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          message: "isActive harus berupa boolean",
        });
      }

      updateData.isActive = isActive;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "Kirim minimal satu field: name, isActive",
      });
    }

    const updatedKapster = await prisma.kapster.update({
      where: {
        id: kapsterId,
      },
      data: updateData,
    });

    return res.status(200).json({
      message: "Kapster berhasil diperbarui",
      data: updatedKapster,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteKapster = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const kapsterId = Number(req.params.id);

    if (!Number.isInteger(kapsterId) || kapsterId <= 0) {
      return res.status(400).json({
        message: "ID Kapster harus berupa angka bulat positif",
      });
    }

    await prisma.kapster.delete({
      where: {
        id: kapsterId,
      },
    });

    return res.status(200).json({
      message: "kapster berhasil dihapus",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return res.status(404).json({
          message: "Kapster tidak ditemukan",
        });
      }

      if (error.code === "P2003") {
        return res.status(409).json({
          message:
            "Kapster masih terkait data lain sehingga tidak dapat dihapus",
        });
      }
    }

    next(error);
  }
};

export const getKapsterSchedule = async (
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
        message: "Jadwal kapster hanya tersedia untuk admin dan staff",
      });
    }

    const paramsResult = kapsterScheduleParamsSchema.safeParse(req.params);
    const queryResult = kapsterScheduleQuerySchema.safeParse(req.query);

    if (!paramsResult.success || !queryResult.success) {
      const issues = [
        ...(!paramsResult.success ? paramsResult.error.issues : []),
        ...(!queryResult.success ? queryResult.error.issues : []),
      ];

      return res.status(400).json({
        message: "Data pencarian jadwal tidak valid",
        errors: issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const kapsterId = paramsResult.data.id;
    const now = new Date();
    const wibOffset = 7 * 60 * 60 * 1000;

    const todayWib = new Date(now.getTime() + wibOffset)
      .toISOString()
      .slice(0, 10);

    const date = queryResult.data.date ?? todayWib;

    // Tengah malam WIB, disimpan sebagai waktu UTC.
    const dayStart = new Date(`${date}T00:00:00+07:00`);

    // Periksa tanggal kalender, bukan hanya formatnya.
    if (
      !Number.isFinite(dayStart.getTime()) ||
      new Date(dayStart.getTime() + wibOffset).toISOString().slice(0, 10) !==
        date
    ) {
      return res.status(400).json({
        message: "Tanggal tidak valid",
      });
    }

    const nextDayStart = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const kapster = await prisma.kapster.findUnique({
      where: { id: kapsterId },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    if (!kapster) {
      return res.status(404).json({
        message: "Kapster tidak ditemukan",
      });
    }

    // Kapster nonaktif tetap boleh dilihat jadwalnya oleh pengelola.
    // Ambil jadwal yang bersinggungan dengan tanggal pilihan.
    const schedules = await prisma.schedule.findMany({
      where: {
        kapsterId,
        startsAt: { lt: nextDayStart },
        blockedUntil: { gt: dayStart },
      },
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        source: true,
        status: true,
        startsAt: true,
        endsAt: true,
        blockedUntil: true,
        holdExpiresAt: true,

        customer: {
          select: {
            id: true,
            name: true,
          },
        },

        order: {
          select: {
            id: true,
            serviceStatus: true,
            paymentStatus: true,
            items: {
              select: {
                serviceName: true,
                quantity: true,
                duration: true,
              },
            },
          },
        },

        booking: {
          select: {
            id: true,
            items: {
              select: {
                serviceName: true,
                quantity: true,
                duration: true,
              },
            },
          },
        },
      },
    });

    const data = schedules.map((schedule) => {
      const isExpired =
        schedule.status === "HELD" &&
        schedule.holdExpiresAt !== null &&
        schedule.holdExpiresAt.getTime() <= now.getTime();

      const displayStatus = isExpired ? "EXPIRED" : schedule.status;

      const isOverdue =
        schedule.order?.serviceStatus === "IN_SERVICE" &&
        schedule.endsAt.getTime() <= now.getTime();

      const isBlocking =
        displayStatus === "HELD" ||
        displayStatus === "CONFIRMED" ||
        displayStatus === "COMPLETED";

      return {
        id: schedule.id,
        source: schedule.source,
        status: schedule.status,
        displayStatus,
        startsAt: schedule.startsAt,
        endsAt: schedule.endsAt,
        blockedUntil: schedule.blockedUntil,
        holdExpiresAt: schedule.holdExpiresAt,
        customer: schedule.customer,

        bookingId: schedule.booking?.id ?? null,
        orderId: schedule.order?.id ?? null,
        serviceStatus: schedule.order?.serviceStatus ?? null,
        paymentStatus: schedule.order?.paymentStatus ?? null,

        items: schedule.order?.items ?? schedule.booking?.items ?? [],

        isBlocking,
        isOverdue,
      };
    });

    // Tampilkan juga order lama yang belum mempunyai jadwal,
    // agar pengelola tahu penyebab kapster tidak tersedia.
    const unscheduledOrders = await prisma.order.findMany({
      where: {
        kapsterId,
        serviceStatus: { not: "COMPLETED" },
        schedule: { is: null },
      },
      orderBy: { checkInAt: "asc" },
      select: {
        id: true,
        serviceStatus: true,
        checkInAt: true,
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Order dari tanggal sebelumnya juga mungkin belum selesai.
    const overdueOrders = await prisma.order.findMany({
      where: {
        kapsterId,
        serviceStatus: "IN_SERVICE",
        schedule: {
          is: {
            endsAt: { lte: now },
          },
        },
      },
      orderBy: { checkInAt: "asc" },
      select: {
        id: true,
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        schedule: {
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            blockedUntil: true,
          },
        },
      },
    });

    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({
      message: "Jadwal kapster berhasil diambil",
      data: {
        date,
        timezone: "Asia/Jakarta",
        serverNow: now,
        kapster,
        schedules: data,
        unscheduledOrders,
        overdueOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};
