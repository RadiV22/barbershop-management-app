import type { Request, Response, NextFunction } from "express";

import { Prisma } from "../generated/prisma/client.js";

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return res.status(409).json({
        message: "Data unik sudah digunakan",
      });
    }

    if (error.code === "P2025") {
      return res.status(404).json({
        message: "Data tidak ditemukan",
      });
    }

    if (error.code === "P2003") {
      return res.status(409).json({
        message: "Operasi tidak dapat dilakukan karena hubungan antar-data",
      });
    }
  }

  console.error("Terjadi error:", error);

  return res.status(500).json({
    message: "Terjadi kesalahan pada server",
  });
};
