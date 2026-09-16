import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { createPaymentSchema } from "../schemas/payment.schema.js";

export const createPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = createPaymentSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Data pembayaran tidak valid",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    const orderId = Number(req.params.id);
    const { method, amountReceived } = req.body ?? {};

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "ID order harus berupa bilangan bulat positif",
      });
    }

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        items: true,
        payment: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        message: "Order tidak ditemukan",
      });
    }

    if (order.paymentStatus === "PAID" || order.payment !== null) {
      return res.status(409).json({
        message: "Order sudah memiliki pembayaran atau sudah ditandai lunas",
      });
    }

    if (order.items.length === 0) {
      return res.status(409).json({
        message: "Order tidak memiliki rincian layanan",
      });
    }

    const amount = order.items.reduce((total, item) => {
      return total + item.quantity * item.unitPrice;
    }, 0);

    if (method === "CASH" && amountReceived < amount) {
      return res.status(400).json({
        message: "Uang diterima kurang dari total tagihan",
      });
    }

    if (method !== "CASH" && amountReceived !== amount) {
      return res.status(400).json({
        message: "Pembayaran non-tunai harus sama dengan total tagihan",
      });
    }

    const change = method === "CASH" ? amountReceived - amount : 0;

    const payment = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.updateMany({
        where: {
          id: orderId,
          paymentStatus: "UNPAID",
          payment: {
            is: null,
          },
        },
        data: {
          paymentStatus: "PAID",
        },
      });

      if (updatedOrder.count === 0) {
        throw new Error("ORDER_NOT_PAYABLE");
      }

      const newPayment = await tx.payment.create({
        data: {
          orderId: orderId,
          amount: amount,
          method: method,
          amountReceived: amountReceived,
          change: change,
        },
      });

      return newPayment;
    });

    return res.status(201).json({
      message: "Pembayaran berhasil dicatat",
      data: payment,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_PAYABLE") {
      return res.status(409).json({
        message: "Order tidak lagi tersedia untuk pembayaran. Muat ulang data.",
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return res.status(409).json({
          message: "Pembayaran untuk order ini sudah tercatat",
        });
      }

      if (error.code === "P2003") {
        return res.status(409).json({
          message: "Order yang akan dibayar sudah tidak tersedia",
        });
      }
    }
    next(error);
  }
};
