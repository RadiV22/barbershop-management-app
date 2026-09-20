import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import {
  createCustomerSchema,
  updateCustomerSchema,
} from "../schemas/customer.schema.js";

export const createCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = createCustomerSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Data customer tidak valid",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { name, phone } = req.body ?? {};

    if (typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({
        message: "Nama customer wajib diisi",
      });
    }

    if (
      phone !== undefined &&
      (typeof phone !== "string" || phone.trim() === "")
    ) {
      return res.status(400).json({
        message: "phone harus berisi string dan tidak boleh kosong",
      });
    }

    const newCustomer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: phone?.trim(),
      },
    });

    return res.status(201).json({
      message: "Customer berhasil didaftarkan",
      data: newCustomer,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        message: "Nomor telepon sudah digunakan",
      });
    }
    next(error);
  }
};

export const getAllCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const customerList = await prisma.customer.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        id: "asc",
      },
      include: {
        membership: true,
      },
    });

    return res.status(200).json({
      message: "Daftar customer berhasil diambil",
      data: customerList,
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const customerId = Number(req.params.id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({
        message: "ID Customer harus berupa bilangan bulat positif",
      });
    }

    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
        deletedAt: null,
      },
    });

    if (!customer) {
      return res.status(404).json({
        message: "customer tidak ditemukan",
      });
    }

    return res.status(200).json({
      message: "Customer berhasil diambil",
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const result = updateCustomerSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Data customer tidak valid",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  try {
    const customerId = Number(req.params.id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({
        message: " ID Customer harus berupa bilangan bulat positif",
      });
    }

    const { name, phone } = result.data;

    const updateData: {
      name?: string;
      phone?: string;
    } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return res.status(400).json({
          message: "Nama Customer harus berupa teks dan tidak boleh kosong",
        });
      }

      updateData.name = name.trim();
    }

    if (phone !== undefined) {
      if (typeof phone !== "string" || phone.trim() === "") {
        return res.status(400).json({
          message: "Nomor telepon harus berupa teks dan tidak boleh kosong",
        });
      }

      updateData.phone = phone.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "Kirim minimal satu field: name, phone",
      });
    }

    const updatedCustomer = await prisma.customer.update({
      where: {
        id: customerId,
        deletedAt: null,
      },
      data: updateData,
    });

    return res.status(200).json({
      message: "Customer berhasil diperbarui",
      data: updatedCustomer,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return res.status(409).json({
          message:
            "Data customer berbenturan dengan data unik yang sudah digunakan",
        });
      }

      if (error.code === "P2025") {
        return res.status(404).json({
          message: "Customer tidak ditemukan",
        });
      }
    }
    next(error);
  }
};

export const deleteCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const customerId = Number(req.params.id);

    if (
      !Number.isInteger(customerId) ||
      customerId <= 0 ||
      customerId > 2147483647
    ) {
      return res.status(400).json({
        message: "ID customer harus berupa bilangan bulat positif yang valid",
      });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // Kunci customer selama pemeriksaan dan penghapusan.
        const customers = await tx.$queryRaw<{ id: number }[]>`
          SELECT "id"
          FROM "customers"
          WHERE "id" = ${customerId}
            AND "deleted_at" IS NULL
          FOR UPDATE
        `;

        if (customers.length === 0) {
          return "NOT_FOUND";
        }

        const unfinishedOrder = await tx.order.findFirst({
          where: {
            customerId,
            OR: [
              { serviceStatus: { not: "COMPLETED" } },
              { paymentStatus: { not: "PAID" } },
            ],
          },
          select: {
            id: true,
          },
        });

        if (unfinishedOrder) {
          return "NOT_ALLOWED";
        }

        // Simpan tanggal penghapusan, bukan menghapus baris database.
        await tx.customer.update({
          where: {
            id: customerId,
          },
          data: {
            deletedAt: new Date(),
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
        message: "Customer tidak ditemukan atau sudah dihapus",
      });
    }

    if (result === "NOT_ALLOWED") {
      return res.status(409).json({
        message:
          "Customer masih memiliki order yang belum selesai atau belum lunas.",
      });
    }

    return res.status(200).json({
      message: "Customer berhasil dihapus. Riwayat order tetap tersimpan.",
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
