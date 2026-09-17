import type { NextFunction, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import {
  createOrderSchema,
  updateOrderStatusSchema,
} from "../schemas/order.schema.js";

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

    const subtotal = orderItems.reduce((total, item) => {
      return total + item.quantity * item.unitPrice;
    }, 0);

    const discountPercent = customer.membership?.isActive
      ? customer.membership.discountPercent
      : 0;

    const discount = Math.round((subtotal * discountPercent) / 100);

    const total = subtotal - discount;

    const newOrder = await prisma.order.create({
      data: {
        customerId,
        kapsterId,
        createdById: userId,
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

    return res.status(201).json({
      message: "Order berhasil dibuat",
      data: newOrder,
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

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const result = await tx.order.updateMany({
        where: {
          id: orderId,
          serviceStatus: order.serviceStatus,
        },
        data: {
          serviceStatus,
          completedAt: serviceStatus === "COMPLETED" ? new Date() : null,
        },
      });

      if (result.count === 0) {
        return null;
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.serviceStatus,
          toStatus: serviceStatus,
          changedById: userId,
        },
      });

      return tx.order.findUniqueOrThrow({
        where: {
          id: orderId,
        },
      });
    });

    if (!updatedOrder) {
      return res.status(409).json({
        message: "Order sudah berubah. Muat ulang data lalu coba kembali",
      });
    }

    return res.status(200).json({
      message: "Status order berhasil diperbarui",
      data: updatedOrder,
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

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "ID order harus berupa bilangan bulat positif",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: {
          id: orderId,
        },
      });

      if (!order) {
        return "NOT_FOUND";
      }

      if (
        order.serviceStatus !== "WAITING" ||
        order.paymentStatus !== "UNPAID"
      ) {
        return "NOT_ALLOWED";
      }

      await tx.orderStatusHistory.deleteMany({
        where: {
          orderId: orderId,
        },
      });

      await tx.orderItem.deleteMany({
        where: {
          orderId: orderId,
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
    });

    if (result === "NOT_FOUND") {
      return res.status(404).json({
        message: "Order tidak ditemukan",
      });
    }

    if (result === "NOT_ALLOWED") {
      return res.status(409).json({
        message:
          "Hanya order yang masih WAITING dan belum dibayar yang boleh dihapus",
      });
    }

    return res.status(200).json({
      message:
        "Order beserta rincian layanan dan riwayat status berhasil dihapus",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
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
