import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";

export const getPublicServices = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const services = await prisma.service.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        id: "asc",
      },
      select: {
        id: true,
        name: true,
        price: true,
        duration: true,
      },
    });

    return res.status(200).json({
      message: "Daftar layanan berhasil diambil",
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicKapsters = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const kapsters = await prisma.kapster.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    });

    return res.status(200).json({
      message: "Daftar kapster aktif berhasil diambil",
      data: kapsters,
    });
  } catch (error) {
    next(error);
  }
};
