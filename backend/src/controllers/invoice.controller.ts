import type { Request, Response, NextFunction } from "express";
import PDFDocument from "pdfkit";
import prisma from "../lib/prisma.js";

export const downloadInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orderId = Number(req.params.id);

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "ID order harus berupa bilangan bulat positif",
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: { name: true },
        },
        kapster: {
          select: { name: true },
        },
        items: {
          orderBy: { id: "asc" },
        },
        createdBy: {
          select: { name: true },
        },
        payment: {
          include: {
            receivedBy: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        message: "Order tidak ditemukan",
      });
    }

    const rupiah = (value: number) =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(value);

    const waktuWib = (value: Date) =>
      new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value) + " WIB";

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
      });

      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on("error", reject);

      doc.font("Helvetica-Bold").fontSize(20);
      doc.text("BARBERSHOP", { align: "center" });
      doc.fontSize(14).text("NOTA ORDER", { align: "center" });
      doc.moveDown();

      doc.font("Helvetica").fontSize(11);
      doc.text(`Nomor order: #${order.id}`);
      doc.text(`Tanggal order: ${waktuWib(order.createdAt)}`);
      doc.text(`Customer: ${order.customer.name}`);
      doc.text(`Kapster: ${order.kapster.name}`);
      doc.text(`Petugas pembuat: ${order.createdBy?.name ?? "-"}`);
      doc.text(
        `Status pembayaran: ${
          order.paymentStatus === "PAID" ? "LUNAS" : "BELUM DIBAYAR"
        }`,
      );
      doc.moveDown();

      doc.font("Helvetica-Bold").text("RINCIAN LAYANAN");
      doc.moveDown(0.5);
      doc.font("Helvetica");

      for (const [index, item] of order.items.entries()) {
        doc.text(`${index + 1}. ${item.serviceName}`);
        doc.text(
          `${item.quantity} x ${rupiah(item.unitPrice)} = ${rupiah(
            item.quantity * item.unitPrice,
          )}`,
        );
        doc.moveDown(0.5);
      }

      doc.moveDown();
      doc.text(`Subtotal: ${rupiah(order.subtotal)}`);
      doc.text(`Diskon (${order.discountPercent}%): ${rupiah(order.discount)}`);
      doc.font("Helvetica-Bold");
      doc.text(`Total: ${rupiah(order.total)}`);
      doc.font("Helvetica");

      if (order.payment) {
        doc.moveDown();
        doc.text(`Metode pembayaran: ${order.payment.method}`);
        doc.text(`Jumlah pembayaran: ${rupiah(order.payment.amount)}`);
        doc.text(`Uang diterima: ${rupiah(order.payment.amountReceived)}`);
        doc.text(`Kembalian: ${rupiah(order.payment.change)}`);
        doc.text(`Waktu pembayaran: ${waktuWib(order.payment.paidAt)}`);
        doc.text(
          `Petugas pembayaran: ${order.payment.receivedBy?.name ?? "-"}`,
        );
      }

      doc.moveDown();
      doc.text("Terima kasih atas kunjungan Anda.", { align: "center" });

      doc.end();
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="nota-order-${order.id}.pdf"`,
    );
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
