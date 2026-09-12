import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";

export const createCustomer = async (req: Request, res: Response) => {
  try {
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
    console.error(error);

    return res.status(500).json({
      message: "Terjadi kesalahan saat membuat customer",
    });
  }
};

export const getAllCustomer = async (req: Request, res: Response) => {
  try {
    const customerList = await prisma.customer.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return res.status(200).json({
      message: "Daftar customer berhasil diambil",
      data: customerList,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Gagal mengambil daftar customer",
    });
  }
};

export const getCustomerById = async (req: Request, res: Response) => {
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
    console.error(error);

    return res.status(500).json({
      message: "Gagal mengambil customer",
    });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const customerId = Number(req.params.id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({
        message: " ID Customer harus berupa bilangan bulat positif",
      });
    }

    const { name, phone } = req.body ?? {};

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

    console.error(error);

    return res.status(500).json({
      message: "Gagal memperbarui customer",
    });
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const customerId = Number(req.params.id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({
        message: "ID customer harus berupa angka bulat",
      });
    }

    await prisma.customer.delete({
      where: {
        id: customerId,
      },
    });

    return res.status(200).json({
      message: "Customer berhasil dihapus",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return res.status(404).json({
          message: "Customer tidak ditemukan",
        });
      }

      if (error.code === "P2003") {
        return res.status(409).json({
          message:
            "Customer masih terkait data lain sehingga tidak dapat dihapus",
        });
      }
    }

    console.error(error);

    return res.status(500).json({
      message: "Gagal menghapus customer",
    });
  }
};
