import type { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

export async function socketAuthentication(
  socket: Socket,
  next: (error?: Error) => void,
) {
  const token: unknown = socket.handshake.auth.token;

  if (typeof token !== "string" || !token.trim()) {
    return next(new Error("Akses ditolak, token tidak ada"));
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error("JWT_SECRET belum dikonfigurasi");
    return next(new Error("Terjadi kesalahan pada server"));
  }

  try {
    const decoded = jwt.verify(token, jwtSecret, {
      algorithms: ["HS256"],
    });

    if (
      typeof decoded === "string" ||
      typeof decoded.userId !== "number" ||
      !Number.isSafeInteger(decoded.userId) ||
      decoded.userId <= 0 ||
      typeof decoded.exp !== "number" ||
      !Number.isSafeInteger(decoded.exp)
    ) {
      return next(new Error("Identitas atau masa berlaku token tidak valid"));
    }

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
      select: {
        id: true,
        role: true,
        customer: {
          select: {
            id: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!user) {
      return next(new Error("Akun tidak ditemukan, silakan login kembali"));
    }

    if (
      user.role === "CUSTOMER" &&
      (!user.customer || user.customer.deletedAt !== null)
    ) {
      return next(new Error("Data customer sudah tidak tersedia"));
    }

    const expiresAt = decoded.exp * 1000;

    // Periksa kembali setelah pengambilan akun dari database.
    if (expiresAt <= Date.now()) {
      return next(new Error("Token sudah kedaluwarsa"));
    }

    socket.data.user = {
      id: user.id,
      role: user.role,
      customerId: user.customer?.id ?? null,
    };

    socket.data.tokenExpiresAt = expiresAt;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new Error("Token tidak valid atau kedaluwarsa"));
    }

    console.error("Gagal memeriksa autentikasi socket:", error);
    return next(new Error("Terjadi kesalahan pada server"));
  }

  next();
}
