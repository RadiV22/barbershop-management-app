import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import {
  createServiceSchema,
  updateServiceSchema,
} from "../schemas/service.schema.js";

const MAX_INT = 2147483647;

export const createService = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = createServiceSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Data layanan tidak valid",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { name, price, duration } = req.body ?? {};

    if (typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({
        message: "Nama layanan wajib diisi",
      });
    }

    if (
      typeof price !== "number" ||
      !Number.isInteger(price) ||
      price < 0 ||
      price > MAX_INT
    ) {
      return res.status(400).json({
        message: `Harga harus berupa angka bulat antara 0 dan ${MAX_INT}`,
      });
    }

    if (
      typeof duration !== "number" ||
      !Number.isInteger(duration) ||
      duration <= 0 ||
      duration > MAX_INT
    ) {
      return res.status(400).json({
        message: `Durasi harus berupa angka bulat antara 1 dan ${MAX_INT}`,
      });
    }

    const newService = await prisma.service.create({
      data: {
        name: name.trim(),
        price,
        duration,
      },
    });

    return res.status(201).json({
      message: "Service berhasil dibuat",
      data: newService,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        message: "Nama layanan sudah digunakan",
      });
    }
    next(error);
  }
};

export const getAllService = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const serviceList = await prisma.service.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return res.status(200).json({
      message: "Daftar service berhasil diambil",
      data: serviceList,
    });
  } catch (error) {
    next(error);
  }
};

export const getServiceById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const serviceId = Number(req.params.id);

    if (!Number.isInteger(serviceId) || serviceId <= 0 || serviceId > MAX_INT) {
      return res.status(400).json({
        message: `ID layanan harus berupa angka bulat antara 1 dan ${MAX_INT}`,
      });
    }

    const service = await prisma.service.findUnique({
      where: {
        id: serviceId,
      },
    });

    if (!service) {
      return res.status(404).json({
        message: "Layanan tidak ditemukan",
      });
    }

    return res.status(200).json({
      message: "Service berhasil diambil",
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

export const updateService = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = updateServiceSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Data layanan tidak valid",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    const serviceId = Number(req.params.id);

    if (!Number.isInteger(serviceId) || serviceId <= 0 || serviceId > MAX_INT) {
      return res.status(400).json({
        message: `ID layanan harus berupa angka bulat antara 1 dan ${MAX_INT}`,
      });
    }

    const { name, price, duration, isActive } = req.body ?? {};

    const updateData: {
      name?: string;
      price?: number;
      duration?: number;
      isActive?: boolean;
    } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return res.status(400).json({
          message: "Nama layanan harus berupa teks dan tidak boleh kosong",
        });
      }

      updateData.name = name.trim();
    }

    if (price !== undefined) {
      if (
        typeof price !== "number" ||
        !Number.isInteger(price) ||
        price < 0 ||
        price > MAX_INT
      ) {
        return res.status(400).json({
          message: `Harga harus berupa angka bulat antara 0 dan ${MAX_INT}`,
        });
      }

      updateData.price = price;
    }

    if (duration !== undefined) {
      if (
        typeof duration !== "number" ||
        !Number.isInteger(duration) ||
        duration <= 0 ||
        duration > MAX_INT
      ) {
        return res.status(400).json({
          message: `Durasi harus berupa angka bulat antara 1 dan ${MAX_INT}`,
        });
      }

      updateData.duration = duration;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          message: "isActive harus berupa true atau false",
        });
      }

      updateData.isActive = isActive;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message:
          "Kirim minimal satu field: name, price, duration, atau isActive",
      });
    }

    const data: Prisma.ServiceUpdateInput = {};

    if (name !== undefined) {
      data.name = name;
    }

    if (duration !== undefined) {
      data.duration = duration;
    }

    if (price !== undefined) {
      data.price = price;
    }

    if (isActive !== undefined) {
      data.isActive = isActive;
    }

    const updatedService = await prisma.service.update({
      where: {
        id: serviceId,
      },
      data: data,
    });

    return res.status(200).json({
      message: "Service berhasil diperbarui",
      data: updatedService,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return res.status(409).json({
          message: "Nama layanan sudah digunakan",
        });
      }

      if (error.code === "P2025") {
        return res.status(404).json({
          message: "Layanan tidak ditemukan",
        });
      }
    }

    next(error);
  }
};

export const deleteService = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const serviceId = Number(req.params.id);

    if (!Number.isInteger(serviceId) || serviceId <= 0 || serviceId > MAX_INT) {
      return res.status(400).json({
        message: `ID layanan harus berupa angka bulat antara 1 dan ${MAX_INT}`,
      });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // Kunci layanan selama pemeriksaan dan penghapusan.
        const services = await tx.$queryRaw<{ id: number }[]>`
          SELECT "id"
          FROM "services"
          WHERE "id" = ${serviceId}
          FOR UPDATE
        `;

        if (services.length === 0) {
          return "NOT_FOUND";
        }

        // Cari satu order terkait yang belum selesai atau belum lunas.
        const unfinishedItem = await tx.orderItem.findFirst({
          where: {
            serviceId,
            order: {
              OR: [
                { serviceStatus: { not: "COMPLETED" } },
                { paymentStatus: { not: "PAID" } },
              ],
            },
          },
          select: {
            id: true,
          },
        });

        if (unfinishedItem) {
          return "NOT_ALLOWED";
        }

        await tx.service.delete({
          where: {
            id: serviceId,
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
        message: "Layanan tidak ditemukan",
      });
    }

    if (result === "NOT_ALLOWED") {
      return res.status(409).json({
        message:
          "Layanan masih digunakan oleh order yang belum selesai atau belum lunas.",
      });
    }

    return res.status(200).json({
      message: "Layanan berhasil dihapus. Riwayat order tetap tersimpan.",
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return res.status(409).json({
        message:
          "Terjadi perubahan data bersamaan. Muat ulang dan coba kembali.",
      });
    }

    next(error);
  }
};
