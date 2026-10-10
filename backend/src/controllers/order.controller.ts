import type { NextFunction, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import {
  createOrderSchema,
  updateOrderStatusSchema,
} from "../schemas/order.schema.js";
import { SCHEDULE_CONFIG } from "../config/schedule.config.js";
import {
  lockActiveKapster,
  findScheduleConflict,
} from "../services/schedule.service.js";

import {
  addMinutes,
  getTodayWib,
  parseWibDate,
} from "../utils/schedule.utils.js";

export const createOrder = async (
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

    const userId = req.user.id;

    const result = createOrderSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Data order tidak valid",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { customerId, kapsterId, items, notes } = result.data;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        membership: true,
      },
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer tidak ditemukan",
      });
    }

    const kapster = await prisma.kapster.findUnique({
      where: { id: kapsterId },
    });

    if (!kapster) {
      return res.status(404).json({
        message: "Kapster tidak ditemukan",
      });
    }

    if (!kapster.isActive) {
      return res.status(400).json({
        message: "Kapster sedang tidak aktif",
      });
    }

    const orderItems: {
      serviceId: number;
      serviceName: string;
      quantity: number;
      unitPrice: number;
      duration: number;
    }[] = [];

    for (const item of items) {
      const service = await prisma.service.findUnique({
        where: { id: item.serviceId },
      });

      if (!service) {
        return res.status(404).json({
          message: `Layanan dengan ID ${item.serviceId} tidak ditemukan`,
        });
      }

      if (!service.isActive) {
        return res.status(400).json({
          message: `Layanan ${service.name} sedang tidak aktif`,
        });
      }

      orderItems.push({
        serviceId: service.id,
        serviceName: service.name,
        quantity: item.quantity,
        unitPrice: service.price,
        duration: service.duration,
      });
    }

    const totalDuration = orderItems.reduce(
      (total, item) => total + item.quantity * item.duration,
      0,
    );

    const operatingMinutes =
      SCHEDULE_CONFIG.closingMinutes - SCHEDULE_CONFIG.openingMinutes;

    if (
      orderItems.some(
        (item) =>
          !Number.isSafeInteger(item.quantity) ||
          item.quantity <= 0 ||
          !Number.isSafeInteger(item.duration) ||
          item.duration <= 0,
      ) ||
      !Number.isSafeInteger(totalDuration) ||
      totalDuration <= 0 ||
      totalDuration + SCHEDULE_CONFIG.bufferMinutes > operatingMinutes
    ) {
      return res.status(400).json({
        message:
          "Total durasi layanan tidak valid atau melebihi jam operasional.",
      });
    }

    const subtotal = orderItems.reduce((total, item) => {
      return total + item.quantity * item.unitPrice;
    }, 0);

    const discountPercent = customer.membership?.isActive
      ? customer.membership.discountPercent
      : 0;

    const discount = Math.round((subtotal * discountPercent) / 100);

    const total = subtotal - discount;

    const transactionResult = await prisma.$transaction(
      async (tx) => {
        // Pertahankan penguncian customer seperti sebelumnya.
        const availableCustomers = await tx.$queryRaw<{ id: number }[]>`
      SELECT "id"
      FROM "customers"
      WHERE "id" = ${customerId}
        AND "deleted_at" IS NULL
      FOR UPDATE
    `;

        if (availableCustomers.length === 0) {
          return {
            success: false as const,
            statusCode: 404,
            message: "Customer sudah dihapus. Pilih customer lain.",
          };
        }

        // Gunakan penguncian kapster yang sama dengan booking online.
        const lockedKapster = await lockActiveKapster(tx, kapsterId);

        if (!lockedKapster) {
          return {
            success: false as const,
            statusCode: 409,
            message: "Kapster tidak tersedia atau sudah nonaktif.",
          };
        }

        // Waktu dihitung setelah mendapatkan kunci kapster.
        const startsAt = new Date();
        const dayStart = parseWibDate(getTodayWib(startsAt));

        if (!dayStart) {
          throw new Error("Gagal menentukan tanggal operasional");
        }

        const openingAt = addMinutes(dayStart, SCHEDULE_CONFIG.openingMinutes);

        const closingAt = addMinutes(dayStart, SCHEDULE_CONFIG.closingMinutes);

        const endsAt = addMinutes(startsAt, totalDuration);

        const blockedUntil = addMinutes(endsAt, SCHEDULE_CONFIG.bufferMinutes);

        if (
          startsAt.getTime() < openingAt.getTime() ||
          blockedUntil.getTime() > closingAt.getTime()
        ) {
          return {
            success: false as const,
            statusCode: 409,
            message:
              "Order langsung harus berada dalam jam operasional 10.00–21.00 WIB, termasuk durasi layanan dan buffer.",
          };
        }

        // Pengaman untuk order lama yang belum memiliki Schedule.
        // Juga menolak jika jadwal perkiraan telah habis,
        // tetapi pengerjaannya belum dinyatakan selesai.
        const unfinishedOrder = await tx.order.findFirst({
          where: {
            kapsterId,
            serviceStatus: {
              not: "COMPLETED",
            },
          },
          select: {
            id: true,
          },
        });

        if (unfinishedOrder) {
          return {
            success: false as const,
            statusCode: 409,
            message:
              "Kapster masih memiliki order yang belum selesai. Periksa order tersebut atau pilih kapster lain.",
          };
        }

        const conflictingSchedule = await findScheduleConflict(
          tx,
          kapsterId,
          startsAt,
          blockedUntil,
          startsAt,
        );

        if (conflictingSchedule) {
          return {
            success: false as const,
            statusCode: 409,
            message:
              "Waktu pengerjaan dan buffer bertabrakan dengan jadwal kapster. Silakan pilih kapster lain.",
          };
        }

        const order = await tx.order.create({
          data: {
            customerId,
            kapsterId,
            createdById: userId,
            checkInAt: startsAt,
            notes: notes?.trim() || null,
            subtotal,
            discountPercent,
            discount,
            total,

            items: {
              create: orderItems,
            },

            statusHistories: {
              create: {
                fromStatus: null,
                toStatus: "WAITING",
                changedById: userId,
              },
            },
          },
          include: {
            items: true,
            createdBy: {
              select: {
                id: true,
                name: true,
              },
            },
            statusHistories: true,
          },
        });

        await tx.schedule.create({
          data: {
            customerId,
            kapsterId,
            orderId: order.id,
            source: "WALK_IN",
            status: "CONFIRMED",
            startsAt,
            endsAt,
            blockedUntil,
            holdExpiresAt: null,
          },
        });

        return {
          success: true as const,
          order,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );

    if (!transactionResult.success) {
      return res.status(transactionResult.statusCode).json({
        message: transactionResult.message,
      });
    }

    return res.status(201).json({
      message: "Order berhasil dibuat",
      data: transactionResult.order,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        return res.status(409).json({
          message:
            "Customer, kapster, atau layanan yang dipilih sudah tidak tersedia. Periksa kembali data pilihan.",
        });
      }
    }

    next(error);
  }
};

export const getAllOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { search, serviceStatus, paymentStatus, sortOrder } = req.query;

    if (search !== undefined && typeof search !== "string") {
      return res.status(400).json({
        message: "Search harus berupa teks",
      });
    }

    if (
      serviceStatus !== undefined &&
      serviceStatus !== "WAITING" &&
      serviceStatus !== "IN_SERVICE" &&
      serviceStatus !== "COMPLETED"
    ) {
      return res.status(400).json({
        message: "Status layanan harus WAITING, IN_SERVICE, atau COMPLETED",
      });
    }

    if (
      paymentStatus !== undefined &&
      paymentStatus !== "UNPAID" &&
      paymentStatus !== "PAID"
    ) {
      return res.status(400).json({
        message: "Status pembayaran harus UNPAID atau PAID",
      });
    }

    if (
      sortOrder !== undefined &&
      sortOrder !== "asc" &&
      sortOrder !== "desc"
    ) {
      return res.status(400).json({
        message: "Urutan harus asc atau desc",
      });
    }

    const where: Prisma.OrderWhereInput = {};

    if (search?.trim()) {
      where.customer = {
        name: {
          contains: search.trim(),
          mode: "insensitive",
        },
      };
    }

    if (serviceStatus !== undefined) {
      where.serviceStatus = serviceStatus;
    }

    if (paymentStatus !== undefined) {
      where.paymentStatus = paymentStatus;
    }

    const orderList = await prisma.order.findMany({
      where: where,
      orderBy: {
        id: sortOrder ?? "asc",
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        kapster: {
          select: {
            id: true,
            name: true,
          },
        },
        items: true,
      },
    });

    return res.status(200).json({
      message: "Daftar order berhasil diambil",
      data: orderList,
    });
  } catch (error) {
    next(error);
  }
};
export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "ID Order harus berupa bilangan bulat positif",
      });
    }

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        kapster: {
          select: {
            id: true,
            name: true,
          },
        },
        items: true,
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        payment: {
          include: {
            receivedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        statusHistories: {
          orderBy: [{ changedAt: "asc" }, { id: "asc" }],
          include: {
            changedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        message: "order tidak ditemukan",
      });
    }
    return res.status(200).json({
      message: "order berhasil diambil",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (
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

    const userId = req.user.id;

    const result = updateOrderStatusSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Data status order tidak valid",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { serviceStatus } = result.data;

    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "ID order harus berupa bilangan bulat positif",
      });
    }

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
    });

    if (!order) {
      return res.status(404).json({
        message: "Order tidak ditemukan",
      });
    }

    const isValidTransition =
      (order.serviceStatus === "WAITING" && serviceStatus === "IN_SERVICE") ||
      (order.serviceStatus === "IN_SERVICE" && serviceStatus === "COMPLETED");

    if (!isValidTransition) {
      return res.status(400).json({
        message: `Status tidak dapat diubah dari ${order.serviceStatus} menjadi ${serviceStatus}`,
      });
    }

    const transactionResult = await prisma.$transaction(
      async (tx) => {
        // Kunci kapster tanpa menolak kapster nonaktif.
        // Penyelesaian pekerjaan tetap harus bisa dicatat.
        const lockedKapsters = await tx.$queryRaw<
          { id: number; isActive: boolean }[]
        >`
      SELECT "id", "is_active" AS "isActive"
      FROM "kapsters"
      WHERE "id" = ${order.kapsterId}
      FOR UPDATE
    `;

        const lockedKapster = lockedKapsters[0];

        if (!lockedKapster) {
          return {
            success: false as const,
            message: "Kapster sudah tidak tersedia.",
          };
        }

        // Baca ulang setelah memperoleh kunci.
        const currentOrder = await tx.order.findUnique({
          where: {
            id: orderId,
          },
          include: {
            items: true,
            schedule: true,
          },
        });

        if (
          !currentOrder ||
          currentOrder.kapsterId !== order.kapsterId ||
          currentOrder.serviceStatus !== order.serviceStatus
        ) {
          return {
            success: false as const,
            message: "Order sudah berubah. Muat ulang dan coba kembali.",
          };
        }

        const schedule = currentOrder.schedule;

        if (schedule && schedule.status !== "CONFIRMED") {
          return {
            success: false as const,
            message:
              "Status jadwal tidak sesuai untuk memproses order. Periksa data order.",
          };
        }

        const now = new Date();

        let startsAt = schedule?.startsAt ?? currentOrder.checkInAt;
        let endsAt = now;
        let warning: string | null = null;

        if (serviceStatus === "IN_SERVICE") {
          if (!lockedKapster.isActive) {
            return {
              success: false as const,
              message: "Kapster nonaktif tidak dapat memulai layanan baru.",
            };
          }

          // Jangan mulai jika kapster masih mengerjakan order lain.
          const otherInServiceOrder = await tx.order.findFirst({
            where: {
              kapsterId: currentOrder.kapsterId,
              id: {
                not: orderId,
              },
              serviceStatus: "IN_SERVICE",
            },
            select: {
              id: true,
            },
          });

          if (otherInServiceOrder) {
            return {
              success: false as const,
              message: "Kapster masih mengerjakan order lain.",
            };
          }

          // Order lama lain belum memiliki waktu yang bisa diperiksa.
          const otherUnscheduledOrder = await tx.order.findFirst({
            where: {
              kapsterId: currentOrder.kapsterId,
              id: {
                not: orderId,
              },
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

          if (otherUnscheduledOrder) {
            return {
              success: false as const,
              message:
                "Kapster memiliki order lain yang belum selesai dan belum memiliki jadwal. Periksa order lama tersebut dahulu.",
            };
          }

          const totalDuration = currentOrder.items.reduce(
            (total, item) => total + item.quantity * item.duration,
            0,
          );

          if (
            currentOrder.items.length === 0 ||
            currentOrder.items.some(
              (item) =>
                !Number.isSafeInteger(item.quantity) ||
                item.quantity <= 0 ||
                !Number.isSafeInteger(item.duration) ||
                item.duration <= 0,
            ) ||
            !Number.isSafeInteger(totalDuration) ||
            totalDuration <= 0 ||
            totalDuration + SCHEDULE_CONFIG.bufferMinutes >
              SCHEDULE_CONFIG.closingMinutes - SCHEDULE_CONFIG.openingMinutes
          ) {
            return {
              success: false as const,
              message: "Durasi order tidak valid. Periksa rincian layanan.",
            };
          }

          startsAt = now;
          endsAt = addMinutes(now, totalDuration);

          const dayStart = parseWibDate(getTodayWib(now));

          if (!dayStart) {
            throw new Error("Gagal menentukan tanggal operasional");
          }

          const openingAt = addMinutes(
            dayStart,
            SCHEDULE_CONFIG.openingMinutes,
          );

          const closingAt = addMinutes(
            dayStart,
            SCHEDULE_CONFIG.closingMinutes,
          );

          if (
            startsAt.getTime() < openingAt.getTime() ||
            addMinutes(endsAt, SCHEDULE_CONFIG.bufferMinutes).getTime() >
              closingAt.getTime()
          ) {
            return {
              success: false as const,
              message:
                "Waktu mulai, durasi layanan, dan buffer melewati jam operasional.",
            };
          }
        }

        if (startsAt.getTime() > endsAt.getTime()) {
          return {
            success: false as const,
            message:
              "Waktu selesai lebih awal dari waktu mulai. Periksa jadwal order.",
          };
        }

        const blockedUntil = addMinutes(endsAt, SCHEDULE_CONFIG.bufferMinutes);

        const conflict = await findScheduleConflict(
          tx,
          currentOrder.kapsterId,
          startsAt,
          blockedUntil,
          now,
          schedule?.id,
        );

        if (conflict && serviceStatus === "IN_SERVICE") {
          return {
            success: false as const,
            message:
              "Jika dimulai sekarang, layanan dan buffer bertabrakan dengan jadwal lain. Periksa jadwal kapster.",
          };
        }

        if (conflict && serviceStatus === "COMPLETED") {
          warning =
            "Order selesai, tetapi waktu pengerjaan atau buffer bertabrakan dengan jadwal lain. Staff perlu menindaklanjuti jadwal terkait.";
        }

        // Semua pemeriksaan penolakan dilakukan sebelum menulis data.
        const updated = await tx.order.updateMany({
          where: {
            id: orderId,
            kapsterId: currentOrder.kapsterId,
            serviceStatus: currentOrder.serviceStatus,
          },
          data: {
            serviceStatus,
            completedAt: serviceStatus === "COMPLETED" ? now : null,
          },
        });

        if (updated.count === 0) {
          return {
            success: false as const,
            message: "Order sudah berubah. Muat ulang dan coba kembali.",
          };
        }

        if (schedule) {
          await tx.schedule.update({
            where: {
              id: schedule.id,
            },
            data: {
              startsAt,
              endsAt,
              blockedUntil,
              status: serviceStatus === "COMPLETED" ? "COMPLETED" : "CONFIRMED",
              holdExpiresAt: null,
            },
          });
        } else {
          // Order lama dibuat oleh staff sebelum Schedule digunakan.
          await tx.schedule.create({
            data: {
              customerId: currentOrder.customerId,
              kapsterId: currentOrder.kapsterId,
              orderId,
              source: "WALK_IN",
              status: serviceStatus === "COMPLETED" ? "COMPLETED" : "CONFIRMED",
              startsAt,
              endsAt,
              blockedUntil,
              holdExpiresAt: null,
            },
          });
        }

        await tx.orderStatusHistory.create({
          data: {
            orderId,
            fromStatus: currentOrder.serviceStatus,
            toStatus: serviceStatus,
            changedById: userId,
            changedAt: now,
          },
        });

        const updatedOrder = await tx.order.findUniqueOrThrow({
          where: {
            id: orderId,
          },
          include: {
            schedule: true,
          },
        });

        return {
          success: true as const,
          order: updatedOrder,
          warning,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );

    if (!transactionResult.success) {
      return res.status(409).json({
        message: transactionResult.message,
      });
    }

    return res.status(200).json({
      message: transactionResult.warning
        ? "Status order berhasil diperbarui. Ada konflik jadwal yang perlu diperiksa."
        : "Status order berhasil diperbarui",
      data: transactionResult.order,
      warning: transactionResult.warning,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePaymentStatus = async (req: Request, res: Response) => {
  try {
    const orderId = Number(req.params.id);
    const { paymentStatus } = req.body ?? {};

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "ID order harus berupa bilangan bulat positif",
      });
    }

    if (paymentStatus !== "PAID") {
      return res.status(400).json({
        message: "Status pembayaran yang dapat dikirim adalah PAID",
      });
    }

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
    });

    if (!order) {
      return res.status(404).json({
        message: "Order tidak ditemukan",
      });
    }

    if (order.paymentStatus === "PAID") {
      return res.status(400).json({
        message: "Order sudah dibayar",
      });
    }

    const updatedOrder = await prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        paymentStatus: paymentStatus,
      },
    });

    return res.status(200).json({
      message: "Status pembayaran berhasil diperbarui",
      data: updatedOrder,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Gagal memperbarui status pembayaran",
    });
  }
};

export const deleteOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0 || orderId > 2147483647) {
      return res.status(400).json({
        message: "ID order harus berupa bilangan bulat positif yang valid",
      });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // Cari kapster yang perlu dikunci.
        const initialOrder = await tx.order.findUnique({
          where: {
            id: orderId,
          },
          select: {
            kapsterId: true,
          },
        });

        if (!initialOrder) {
          return "NOT_FOUND";
        }

        // Gunakan urutan kunci yang sama dengan perubahan status order.
        // Kapster nonaktif tetap boleh memiliki order yang dibatalkan.
        await tx.$queryRaw`
          SELECT "id"
          FROM "kapsters"
          WHERE "id" = ${initialOrder.kapsterId}
          FOR UPDATE
        `;

        // Kunci order agar pembayaran/perubahan order tidak berjalan
        // bersamaan dengan penghapusan.
        const lockedOrders = await tx.$queryRaw<{ id: number }[]>`
          SELECT "id"
          FROM "orders"
          WHERE "id" = ${orderId}
          FOR UPDATE
        `;

        if (lockedOrders.length === 0) {
          return "NOT_FOUND";
        }

        // Baca kembali setelah mendapatkan kunci.
        const order = await tx.order.findUnique({
          where: {
            id: orderId,
          },
          include: {
            payment: true,
            schedule: {
              include: {
                booking: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        });

        if (!order) {
          return "NOT_FOUND";
        }

        if (order.kapsterId !== initialOrder.kapsterId) {
          return "CHANGED";
        }

        if (
          order.serviceStatus !== "WAITING" ||
          order.paymentStatus !== "UNPAID" ||
          order.payment !== null
        ) {
          return "NOT_ALLOWED";
        }

        // Booking online memerlukan alur pembatalan tersendiri.
        if (
          order.schedule &&
          (order.schedule.source === "ONLINE" ||
            order.schedule.booking !== null)
        ) {
          return "ONLINE_BOOKING";
        }

        if (order.schedule) {
          await tx.schedule.update({
            where: {
              id: order.schedule.id,
            },
            data: {
              status: "CANCELLED",
              orderId: null,
              holdExpiresAt: null,
            },
          });
        }

        await tx.orderStatusHistory.deleteMany({
          where: {
            orderId,
          },
        });

        await tx.orderItem.deleteMany({
          where: {
            orderId,
          },
        });

        await tx.order.delete({
          where: {
            id: orderId,
            serviceStatus: "WAITING",
            paymentStatus: "UNPAID",
          },
        });

        return "DELETED";
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );

    if (result === "NOT_FOUND") {
      return res.status(404).json({
        message: "Order tidak ditemukan",
      });
    }

    if (result === "CHANGED") {
      return res.status(409).json({
        message: "Order sudah berubah. Muat ulang data lalu coba kembali.",
      });
    }

    if (result === "NOT_ALLOWED") {
      return res.status(409).json({
        message:
          "Hanya order yang masih WAITING dan belum dibayar yang boleh dihapus",
      });
    }

    if (result === "ONLINE_BOOKING") {
      return res.status(409).json({
        message:
          "Order dari booking online tidak dapat dihapus melalui fitur ini.",
      });
    }

    return res.status(200).json({
      message:
        "Order berhasil dihapus. Jika memiliki jadwal, jadwal tersebut sudah dibatalkan.",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025" || error.code === "P2034") {
        return res.status(409).json({
          message:
            "Order sudah berubah atau dihapus. Muat ulang data sebelum mencoba lagi.",
        });
      }

      if (error.code === "P2003") {
        return res.status(409).json({
          message: "Order masih terkait data lain sehingga tidak dapat dihapus",
        });
      }
    }

    next(error);
  }
};

export const getOrderHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { search, startDate, endDate } = req.query;

    if (search !== undefined && typeof search !== "string") {
      return res.status(400).json({
        message: "Search harus berupa teks",
      });
    }

    // Validasi tanggal kalender, lalu konversi awal hari WIB ke UTC.
    const parseDateWib = (value: unknown): Date | null => {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
      }

      const date = new Date(`${value}T00:00:00.000Z`);

      if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
      ) {
        return null;
      }

      return new Date(date.getTime() - 7 * 60 * 60 * 1000);
    };

    const start = startDate !== undefined ? parseDateWib(startDate) : null;

    const end = endDate !== undefined ? parseDateWib(endDate) : null;

    if (startDate !== undefined && !start) {
      return res.status(400).json({
        message: "startDate harus tanggal valid dengan format YYYY-MM-DD",
      });
    }

    if (endDate !== undefined && !end) {
      return res.status(400).json({
        message: "endDate harus tanggal valid dengan format YYYY-MM-DD",
      });
    }

    if (start && end && start.getTime() > end.getTime()) {
      return res.status(400).json({
        message: "startDate tidak boleh melewati endDate",
      });
    }

    const where: Prisma.OrderWhereInput = {
      serviceStatus: "COMPLETED",
      paymentStatus: "PAID",
    };

    if (search?.trim()) {
      where.customer = {
        name: {
          contains: search.trim(),
          mode: "insensitive",
        },
      };
    }

    if (start || end) {
      const completedAt: Prisma.DateTimeNullableFilter = {};

      if (start) {
        completedAt.gte = start;
      }

      if (end) {
        // Batas akhir: sebelum pukul 00.00 WIB hari berikutnya.
        completedAt.lt = new Date(end.getTime() + 24 * 60 * 60 * 1000);
      }

      where.completedAt = completedAt;
    }

    const orderHistory = await prisma.order.findMany({
      where,
      orderBy: [{ completedAt: "desc" }, { id: "desc" }],
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        kapster: {
          select: {
            id: true,
            name: true,
          },
        },
        items: true,
        payment: true,
      },
    });

    return res.status(200).json({
      message: "Riwayat order berhasil diambil",
      data: orderHistory,
    });
  } catch (error) {
    next(error);
  }
};
