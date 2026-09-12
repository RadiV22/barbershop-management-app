import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { customerId, kapsterId, items, notes } = req.body ?? {};

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({
        message: "ID Customer harus berupa bilangan bulat positif",
      });
    }

    if (!Number.isInteger(kapsterId) || kapsterId <= 0) {
      return res.status(400).json({
        message: "ID Kapster harus berupa bilangan bulat positif",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Pilih Minimal Satu Layanan",
      });
    }

    for (const item of items) {
      if (typeof item !== "object" || item == null || Array.isArray(item)) {
        return res.status(400).json({
          message: "Setiap item harus berupa object",
        });
      }

      if (!Number.isInteger(item.serviceId) || item.serviceId <= 0) {
        return res.status(400).json({
          message: "ID Layanan harus berupa bilangan bulat positif",
        });
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return res.status(400).json({
          message: "Quantity harus berupa bilangan bulat positif",
        });
      }
    }

    const serviceIds: number[] = items.map((item) => item.serviceId);

    if (new Set(serviceIds).size !== serviceIds.length) {
      return res.status(400).json({
        message: "Layanan yang sama cukup ditulis sekali, sesuaikan Quantity",
      });
    }

    if (notes !== undefined && typeof notes !== "string") {
      return res.status(400).json({
        message: "Catatan harus berupa teks",
      });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
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

    const newOrder = await prisma.order.create({
      data: {
        customerId: customerId,
        kapsterId: kapsterId,
        notes: notes?.trim() || null,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: true,
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

    console.error(error);

    return res.status(500).json({
      message: "Gagal membuat order",
    });
  }
};

export const getAllOrder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const orderList = await prisma.order.findMany({
      orderBy: {
        id: "asc",
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

    res.status(200).json({
      message: "Daftar order berhasil diambil",
      data: orderList,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal mengambil daftar order",
    });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
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
    console.error(error);

    return res.status(500).json({
      message: "Gagal mengambil order",
    });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const orderId = Number(req.params.id);
    const { serviceStatus } = req.body ?? {};

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "ID order harus berupa bilangan bulat positif",
      });
    }

    if (
      serviceStatus !== "WAITING" &&
      serviceStatus !== "IN_SERVICE" &&
      serviceStatus !== "COMPLETED"
    ) {
      return res.status(400).json({
        message: "Status harus WAITING, IN_SERVICE, atau COMPLETED",
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

    const updatedOrder = await prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        serviceStatus: serviceStatus,
        completedAt: serviceStatus === "COMPLETED" ? new Date() : null,
      },
    });

    return res.status(200).json({
      message: "Status order berhasil diperbarui",
      data: updatedOrder,
    });

    // Berikutnya: cari order dan periksa perpindahan status.
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Gagal memperbarui status order",
    });
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

export const deleteOrder = async (req: Request, res: Response) => {
  try {
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "ID order harus berupa bilangan bulat positif",
      });
    }

    await prisma.$transaction([
      prisma.orderItem.deleteMany({
        where: {
          orderId: orderId,
        },
      }),
      prisma.order.delete({
        where: {
          id: orderId,
        },
      }),
    ]);

    return res.status(200).json({
      message: "Order beserta rincian layanan berhasil dihapus",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return res.status(404).json({
          message: "Order tidak ditemukan",
        });
      }

      if (error.code === "P2003") {
        return res.status(409).json({
          message: "Order masih terkait data lain sehingga tidak dapat dihapus",
        });
      }
    }

    console.error(error);

    return res.status(500).json({
      message: "Gagal menghapus order",
    });
  }
};
