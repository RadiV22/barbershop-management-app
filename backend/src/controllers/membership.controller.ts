import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import prisma from "../lib/prisma.js";
import { updateMembershipSchema } from "../schemas/membership.schema.js";

export const activateMembership = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const customerId = Number(req.params.id);

    if (!Number.isSafeInteger(customerId) || customerId <= 0) {
      return res.status(400).json({
        message: "ID customer harus berupa bilangan bulat positif",
      });
    }

    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer tidak ditemukan",
      });
    }

    const membership = await prisma.membership.upsert({
      where: {
        customerId: customerId,
      },
      create: {
        customerId: customerId,
        memberCode: `MBR-${randomUUID()}`,
      },
      update: {
        isActive: true,
      },
    });

    return res.status(200).json({
      message: "Membership aktif",
      data: membership,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMembership = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const customerId = Number(req.params.id);

    if (!Number.isSafeInteger(customerId) || customerId <= 0) {
      return res.status(400).json({
        message: "ID customer harus berupa bilangan bulat positif",
      });
    }

    const result = updateMembershipSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Data membership tidak valid",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { isActive } = result.data;

    const membership = await prisma.membership.findUnique({
      where: {
        customerId: customerId,
      },
    });

    if (!membership) {
      return res.status(404).json({
        message: "Membership customer tidak ditemukan",
      });
    }

    const updatedMembership = await prisma.membership.update({
      where: {
        customerId: customerId,
      },
      data: {
        isActive: isActive,
      },
    });

    return res.status(200).json({
      message: "Status membership berhasil diperbarui",
      data: updatedMembership,
    });
  } catch (error) {
    next(error);
  }
};
