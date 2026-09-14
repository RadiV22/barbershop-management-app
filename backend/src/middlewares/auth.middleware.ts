import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

export const authentication = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Akses ditolak, token tidak ada",
    });
  }

  const [scheme, token, extra] = authHeader.trim().split(/\s+/);

  if (scheme?.toLowerCase() !== "bearer" || !token || extra !== undefined) {
    return res.status(401).json({
      message: "Format Authorization harus Bearer <token>",
    });
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error("JWT_SECRET belum dikonfigurasi");

    return res.status(500).json({
      message: "Terjadi kesalahan pada server",
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret, {
      algorithms: ["HS256"],
    });

    if (
      typeof decoded === "string" ||
      typeof decoded.userId !== "number" ||
      !Number.isSafeInteger(decoded.userId) ||
      decoded.userId <= 0
    ) {
      return res.status(401).json({
        message: "Identitas dalam token tidak valid",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "Akun tidak ditemukan, silakan login kembali",
      });
    }

    req.user = user;
  } catch (error) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError ||
      error instanceof jwt.NotBeforeError
    ) {
      return res.status(401).json({
        message: "Token tidak valid atau kedaluwarsa",
      });
    }

    console.error("Gagal memeriksa autentikasi:", error);

    return res.status(500).json({
      message: "Terjadi kesalahan pada server",
    });
  }

  next();
};
