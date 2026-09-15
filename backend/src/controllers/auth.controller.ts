import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { registerSchema } from "../schemas/auth.schema.js";
import { loginSchema } from "../schemas/auth.schema.js";
import jwt from "jsonwebtoken";

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Data registrasi tidak valid",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { name, email, password } = result.data;

    const existingUser = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email sudah digunakan",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name,
        email: email,
        passwordHash: passwordHash,
        role: "STAFF",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      message: "Akun berhasil dibuat",
      data: user,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        message: "Email sudah digunakan",
      });
    }

    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Data login tidak valid",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { email, password } = result.data;

    const existingUser = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!existingUser) {
      return res.status(401).json({
        message: "Email atau password salah",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.passwordHash,
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Email atau password salah",
      });
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("JWT_SECRET belum dikonfigurasi");
    }

    const token = jwt.sign(
      {
        userId: existingUser.id,
      },
      jwtSecret,
      {
        algorithm: "HS256",
        expiresIn: "1h",
      },
    );

    return res.status(200).json({
      message: "Login berhasil",
      token: token,
      data: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
