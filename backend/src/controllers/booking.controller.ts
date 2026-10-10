import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { createBookingSchema } from "../schemas/booking.schema.js";
import { SCHEDULE_CONFIG } from "../config/schedule.config.js";
import { addMinutes, parseWibDate } from "../utils/schedule.utils.js";
import { Prisma } from "../generated/prisma/client.js";
import {
  lockActiveKapster,
  findScheduleConflict,
} from "../services/schedule.service.js";

export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Anda belum terautentikasi",
      });
    }

    if (req.user.role !== "CUSTOMER") {
      return res.status(403).json({
        message: "Booking ini hanya dapat dibuat oleh akun customer",
      });
    }

    const result = createBookingSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Data booking tidak valid",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const customer = await prisma.customer.findUnique({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    if (!customer || customer.deletedAt !== null) {
      return res.status(403).json({
        message: "Profil customer tidak tersedia untuk membuat booking",
      });
    }

    const { kapsterId, serviceIds, date, time, notes } = result.data;

    const dayStart = parseWibDate(date);

    if (!dayStart) {
      return res.status(400).json({
        message: "Tanggal booking tidak valid",
      });
    }

    const [hours, minutes] = time.split(":").map(Number);

    const startsAt = addMinutes(dayStart, hours * 60 + minutes);

    const openingAt = addMinutes(dayStart, SCHEDULE_CONFIG.openingMinutes);

    const closingAt = addMinutes(dayStart, SCHEDULE_CONFIG.closingMinutes);

    if (startsAt.getTime() <= Date.now()) {
      return res.status(400).json({
        message: "Jam booking harus berada setelah waktu sekarang",
      });
    }

    if (
      startsAt.getTime() < openingAt.getTime() ||
      startsAt.getTime() >= closingAt.getTime()
    ) {
      return res.status(400).json({
        message:
          "Jam mulai booking harus berada antara 10.00 sampai sebelum 21.00 WIb",
      });
    }
    const transactionResult = await prisma.$transaction(
      async (tx) => {
        // Kunci kapster selama pemeriksaan dan penyimpanan booking.
        const kapster = await lockActiveKapster(tx, kapsterId);

        if (!kapster) {
          return {
            success: false as const,
            statusCode: 409,
            message:
              "Kapster sudah tidak tersedia. Silakan pilih kapster lain.",
          };
        }

        // Ambil layanan aktif beserta harga dan durasi dari database.
        const services = await tx.service.findMany({
          where: {
            id: {
              in: serviceIds,
            },
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
          },
        });

        if (services.length !== serviceIds.length) {
          return {
            success: false as const,
            statusCode: 409,
            message:
              "Ada layanan yang sudah tidak tersedia. Silakan pilih kembali layanan.",
          };
        }

        const totalDuration = services.reduce(
          (total, service) => total + service.duration,
          0,
        );

        if (
          !Number.isSafeInteger(totalDuration) ||
          services.some((service) => service.duration <= 0)
        ) {
          return {
            success: false as const,
            statusCode: 409,
            message: "Durasi layanan tidak valid. Silakan hubungi barbershop.",
          };
        }

        // Waktu layanan selesai, kemudian tambahkan buffer.
        const endsAt = addMinutes(startsAt, totalDuration);

        const blockedUntil = addMinutes(endsAt, SCHEDULE_CONFIG.bufferMinutes);

        if (blockedUntil.getTime() > closingAt.getTime()) {
          return {
            success: false as const,
            statusCode: 409,
            message:
              "Durasi layanan beserta buffer melewati jam tutup. Silakan pilih jam lebih awal.",
          };
        }

        // Periksa ulang karena transaksi mungkin sempat menunggu kunci kapster.
        const now = new Date();

        if (startsAt.getTime() <= now.getTime()) {
          return {
            success: false as const,
            statusCode: 409,
            message:
              "Jam yang dipilih sudah terlewati. Silakan pilih jadwal lain.",
          };
        }

        const todayWib = new Date(
          now.getTime() + SCHEDULE_CONFIG.utcOffsetMinutes * 60 * 1000,
        )
          .toISOString()
          .slice(0, 10);

        if (date === todayWib) {
          const overdueOrder = await tx.order.findFirst({
            where: {
              kapsterId,
              serviceStatus: "IN_SERVICE",
              schedule: {
                is: {
                  endsAt: {
                    lte: now,
                  },
                },
              },
            },
            select: {
              id: true,
            },
          });

          if (overdueOrder) {
            return {
              success: false as const,
              statusCode: 409,
              message:
                "Kapster masih menyelesaikan layanan yang melewati perkiraan waktu. Jadwal hari ini sementara belum tersedia. Silakan coba kembali nanti atau pilih kapster lain.",
            };
          }
        }

        // Periksa order yang belum selesai dan belum memiliki jadwal.
        const unscheduledOrder = await tx.order.findFirst({
          where: {
            kapsterId,
            serviceStatus: {
              not: "COMPLETED",
            },
            schedule: {
              is: null,
            },
          },
          select: {
            id: true,
          },
        });

        if (unscheduledOrder) {
          return {
            success: false as const,
            statusCode: 409,
            message:
              "Kapster masih memiliki order yang belum selesai dan belum memiliki jadwal. Silakan hubungi barbershop atau pilih kapster lain.",
          };
        }

        // Periksa bentrokan dengan jadwal yang sudah tersimpan.
        const conflictingSchedule = await findScheduleConflict(
          tx,
          kapsterId,
          startsAt,
          blockedUntil,
          now,
        );

        if (conflictingSchedule) {
          return {
            success: false as const,
            statusCode: 409,
            message: "Jadwal sudah tidak tersedia. Silakan pilih jam lain.",
          };
        }

        // Sementara: perhitungan harga dan penyimpanan ditambahkan berikutnya.
        // Hitung harga seluruh layanan yang dipilih.
        // Pada booking ini, setiap layanan dipilih satu kali.
        const subtotal = services.reduce(
          (total, service) => total + service.price,
          0,
        );

        if (
          services.some(
            (service) =>
              !Number.isSafeInteger(service.price) || service.price < 0,
          ) ||
          !Number.isSafeInteger(subtotal) ||
          subtotal > 2147483647
        ) {
          return {
            success: false as const,
            statusCode: 409,
            message: "Harga layanan tidak valid. Silakan hubungi barbershop.",
          };
        }

        // Cari membership milik customer yang sedang membuat booking.
        const membership = await tx.membership.findUnique({
          where: {
            customerId: customer.id,
          },
          select: {
            isActive: true,
            discountPercent: true,
          },
        });

        // Customer tanpa membership aktif mendapatkan diskon 0%.
        const discountPercent = membership?.isActive
          ? membership.discountPercent
          : 0;

        if (
          !Number.isInteger(discountPercent) ||
          discountPercent < 0 ||
          discountPercent > 100
        ) {
          return {
            success: false as const,
            statusCode: 409,
            message:
              "Diskon membership tidak valid. Silakan hubungi barbershop.",
          };
        }

        // Diskon dibulatkan ke bawah menjadi rupiah utuh.
        const discount = Math.round((subtotal * discountPercent) / 100);

        const total = subtotal - discount;

        // Sementara: penyimpanan booking ditambahkan berikutnya.
        const createdAt = new Date();

        // Pastikan waktu mulai belum terlewati selama proses pemeriksaan.
        if (startsAt.getTime() <= createdAt.getTime()) {
          return {
            success: false as const,
            statusCode: 409,
            message:
              "Jam yang dipilih sudah terlewati. Silakan pilih jadwal lain.",
          };
        }

        const holdExpiresAt = new Date(
          Math.min(
            addMinutes(createdAt, SCHEDULE_CONFIG.holdMinutes).getTime(),
            startsAt.getTime(),
          ),
        );

        const booking = await tx.booking.create({
          data: {
            subtotal,
            discountPercent,
            discount,
            total,
            notes: notes || null,

            schedule: {
              create: {
                customer: {
                  connect: {
                    id: customer.id,
                  },
                },
                kapster: {
                  connect: {
                    id: kapsterId,
                  },
                },
                source: "ONLINE",
                status: "HELD",
                startsAt,
                endsAt,
                blockedUntil,
                holdExpiresAt,
              },
            },

            items: {
              create: services.map((service) => ({
                service: {
                  connect: {
                    id: service.id,
                  },
                },
                serviceName: service.name,
                quantity: 1,
                unitPrice: service.price,
                duration: service.duration,
              })),
            },
          },

          include: {
            schedule: true,
            items: true,
          },
        });

        return {
          success: true as const,
          booking,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );

    if (!transactionResult.success) {
      return res.status(transactionResult.statusCode).json({
        message: transactionResult.message,
      });
    }

    return res.status(201).json({
      message:
        "Booking berhasil dibuat. Jadwal ditahan sementara sampai batas pembayaran.",
      data: transactionResult.booking,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyBookings = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Anda belum terautentikasi",
      });
    }

    if (req.user.role !== "CUSTOMER") {
      return res.status(403).json({
        message: "Fitur ini hanya untuk akun customer",
      });
    }

    const customer = await prisma.customer.findUnique({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    if (!customer || customer.deletedAt !== null) {
      return res.status(403).json({
        message: "Profil customer tidak tersedia",
      });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        schedule: {
          customerId: customer.id,
        },
      },
      orderBy: {
        id: "desc",
      },
      include: {
        items: true,
        schedule: {
          include: {
            kapster: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const now = new Date();

    const data = bookings.map((booking) => {
      const schedule = booking.schedule;

      const isExpired =
        schedule.status === "HELD" &&
        schedule.holdExpiresAt !== null &&
        schedule.holdExpiresAt.getTime() <= now.getTime();

      return {
        ...booking,
        displayStatus: isExpired ? "EXPIRED" : schedule.status,
      };
    });

    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({
      message: "Daftar booking berhasil diambil",
      data,
    });
  } catch (error) {
    next(error);
  }
};
