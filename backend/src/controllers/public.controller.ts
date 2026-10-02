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
