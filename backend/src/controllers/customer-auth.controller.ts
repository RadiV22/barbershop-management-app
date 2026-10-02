import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { registerCustomerSchema } from "../schemas/customer-auth.schema.js";

export const registerCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = registerCustomerSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Data registrasi customer tidak valid",
        errros: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { name, email, phone, password } = result.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email sudah digunakan",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "CUSTOMER",
        customer: {
          create: {
            name,
            phone,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    return res.status(201).json({
      message: "Akun customer berhasil dibuat. silahkan login.",
      data: user,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "p2002"
    ) {
      return res.status(409).json({
        message: "Data akun sudah digunakan",
      });
    }

    next(error);
  }
};
