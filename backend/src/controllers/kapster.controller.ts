import type { NextFunction, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";

export const createKapster = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
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
    const kapsterId = Number(req.params.id);

    if (!Number.isInteger(kapsterId) || kapsterId <= 0) {
      return res.status(400).json({
        message: "ID Kapster harus berupa bilangan bulat positif",
      });
    }

    const { name, isActive } = req.body ?? {};

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
