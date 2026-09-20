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

    const membership = await prisma.$transaction(
      async (tx) => {
        const customers = await tx.$queryRaw<{ id: number }[]>`
      SELECT "id"
      FROM "customers"
      WHERE "id" = ${customerId}
        AND "deleted_at" IS NULL
      FOR UPDATE
    `;

        if (customers.length === 0) {
          return null;
        }

        return tx.membership.upsert({
          where: {
            customerId,
          },
          create: {
            customerId,
            memberCode: `MBR-${randomUUID()}`,
            isActive: true,
          },
          update: {
            isActive: true,
          },
        });
      },
      {
        isolationLevel: "ReadCommitted",
      },
    );

    if (!membership) {
      return res.status(404).json({
        message: "Customer tidak ditemukan atau sudah dihapus",
      });
    }

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

    const updatedMembership = await prisma.$transaction(
      async (tx) => {
        const customers = await tx.$queryRaw<{ id: number }[]>`
      SELECT "id"
      FROM "customers"
      WHERE "id" = ${customerId}
        AND "deleted_at" IS NULL
      FOR UPDATE
    `;

        if (customers.length === 0) {
          return "CUSTOMER_NOT_FOUND";
        }

        const membership = await tx.membership.findUnique({
          where: {
            customerId,
          },
        });

        if (!membership) {
          return "MEMBERSHIP_NOT_FOUND";
        }

        return tx.membership.update({
          where: {
            customerId,
          },
          data: {
            isActive,
          },
        });
      },
      {
        isolationLevel: "ReadCommitted",
      },
    );

    if (updatedMembership === "CUSTOMER_NOT_FOUND") {
      return res.status(404).json({
        message: "Customer tidak ditemukan atau sudah dihapus",
      });
    }

    if (updatedMembership === "MEMBERSHIP_NOT_FOUND") {
      return res.status(404).json({
        message: "Membership customer tidak ditemukan",
      });
    }

    return res.status(200).json({
      message: "Status membership berhasil diperbarui",
      data: updatedMembership,
    });
  } catch (error) {
    next(error);
  }
};
