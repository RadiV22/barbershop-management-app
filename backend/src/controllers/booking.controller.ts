import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import {
  createBookingSchema,
  bookingParamsSchema,
} from "../schemas/booking.schema.js";
import { SCHEDULE_CONFIG } from "../config/schedule.config.js";
import { addMinutes, parseWibDate } from "../utils/schedule.utils.js";
import { Prisma } from "../generated/prisma/client.js";
import {
  lockActiveKapster,
  findScheduleConflict,
} from "../services/schedule.service.js";
import {
  notifyBookingChanged,
  notifyAvailabilityChanged,
  notifyOrdersChanged,
} from "../lib/socket.js";

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

    notifyBookingChanged(transactionResult.booking.schedule.customerId);

    notifyAvailabilityChanged();

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

export const getAllBookings = async (
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

    if (req.user.role !== "ADMIN" && req.user.role !== "STAFF") {
      return res.status(403).json({
        message: "Daftar seluruh booking hanya tersedia untuk admin dan staff",
      });
    }

    const bookings = await prisma.booking.findMany({
      orderBy: {
        id: "desc",
      },
      include: {
        items: true,
        schedule: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
            kapster: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        payments: {
          orderBy: {
            id: "desc",
          },
          select: {
            id: true,
            amount: true,
            status: true,
            paymentType: true,
            paidAt: true,
            needsReview: true,
            reviewReason: true,
            reviews: {
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              select: {
                id: true,
                reason: true,
                previousReason: true,
                createdAt: true,
                reviewedBy: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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
      message: "Daftar booking untuk admin dan staff berhasil diambil",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const checkInBooking = async (
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

    if (req.user.role !== "ADMIN" && req.user.role !== "STAFF") {
      return res.status(403).json({
        message: "Kedatangan customer hanya dapat dicatat oleh admin dan staff",
      });
    }

    const result = bookingParamsSchema.safeParse(req.params);

    if (!result.success) {
      return res.status(400).json({
        message: "ID booking tidak valid",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const bookingId = result.data.id;

    const booking = await prisma.booking.findUnique({
      where: {
        id: bookingId,
      },
      select: {
        id: true,
        schedule: {
          select: {
            id: true,
            customerId: true,
            kapsterId: true,
            orderId: true,
            status: true,
            startsAt: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking tidak ditemukan",
      });
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
      // Urutan kunci: customer, kapster, kemudian booking.
      const customers = await tx.$queryRaw<{ id: number }[]>`
    SELECT "id"
    FROM "customers"
    WHERE "id" = ${booking.schedule.customerId}
      AND "deleted_at" IS NULL
    FOR UPDATE
  `;

      if (customers.length === 0) {
        return {
          success: false as const,
          statusCode: 409,
          message: "Profil customer sudah tidak tersedia.",
        };
      }

      const kapster = await lockActiveKapster(tx, booking.schedule.kapsterId);

      if (!kapster) {
        return {
          success: false as const,
          statusCode: 409,
          message:
            "Kapster sedang tidak tersedia. Periksa jadwal terlebih dahulu.",
        };
      }

      await tx.$queryRaw`
    SELECT "id"
    FROM "bookings"
    WHERE "id" = ${bookingId}
    FOR UPDATE
  `;

      // Baca ulang setelah mendapatkan kunci.
      const currentBooking = await tx.booking.findUnique({
        where: {
          id: bookingId,
        },
        include: {
          items: true,
          schedule: true,
          payments: {
            include: {
              payment: true,
            },
          },
        },
      });

      if (!currentBooking) {
        return {
          success: false as const,
          statusCode: 404,
          message: "Booking tidak ditemukan.",
        };
      }

      const schedule = currentBooking.schedule;

      if (
        schedule.customerId !== booking.schedule.customerId ||
        schedule.kapsterId !== booking.schedule.kapsterId
      ) {
        return {
          success: false as const,
          statusCode: 409,
          message: "Data booking sudah berubah. Muat ulang lalu coba kembali.",
        };
      }

      if (schedule.orderId !== null) {
        return {
          success: false as const,
          statusCode: 409,
          message: "Kedatangan customer untuk booking ini sudah dicatat.",
        };
      }

      if (schedule.source !== "ONLINE" || schedule.status !== "CONFIRMED") {
        return {
          success: false as const,
          statusCode: 409,
          message: "Hanya booking online terkonfirmasi yang dapat check-in.",
        };
      }

      if (currentBooking.payments.some((payment) => payment.needsReview)) {
        return {
          success: false as const,
          statusCode: 409,
          message: "Pembayaran perlu diperiksa sebelum kedatangan dicatat.",
        };
      }

      const paidPayments = currentBooking.payments.filter(
        (payment) => payment.status === "PAID",
      );

      if (paidPayments.length !== 1) {
        return {
          success: false as const,
          statusCode: 409,
          message:
            "Booking harus memiliki tepat satu pembayaran yang berhasil.",
        };
      }

      const paidPayment = paidPayments[0]!;

      if (
        paidPayment.amount !== currentBooking.total ||
        paidPayment.currency !== "IDR" ||
        paidPayment.paidAt === null ||
        paidPayment.payment !== null
      ) {
        return {
          success: false as const,
          statusCode: 409,
          message:
            "Data pembayaran tidak sesuai atau sudah digunakan oleh order.",
        };
      }

      if (currentBooking.items.length === 0) {
        return {
          success: false as const,
          statusCode: 409,
          message: "Booking tidak memiliki rincian layanan.",
        };
      }

      const now = new Date();

      const todayWib = new Date(
        now.getTime() + SCHEDULE_CONFIG.utcOffsetMinutes * 60 * 1000,
      )
        .toISOString()
        .slice(0, 10);

      const bookingDateWib = new Date(
        schedule.startsAt.getTime() +
          SCHEDULE_CONFIG.utcOffsetMinutes * 60 * 1000,
      )
        .toISOString()
        .slice(0, 10);

      if (todayWib !== bookingDateWib) {
        return {
          success: false as const,
          statusCode: 409,
          message: "Check-in hanya dapat dilakukan pada tanggal booking.",
        };
      }

      if (now.getTime() >= schedule.endsAt.getTime()) {
        return {
          success: false as const,
          statusCode: 409,
          message:
            "Perkiraan waktu layanan sudah terlewati. Periksa penanganan jadwal dengan pengelola.",
        };
      }

      // Sesuaikan jenis pembayaran Midtrans dengan enum PaymentMethod.
      const method =
        paidPayment.paymentType === "credit_card"
          ? "CARD"
          : paidPayment.paymentType === "qris"
            ? "QRIS"
            : paidPayment.paymentType === "bank_transfer" ||
                paidPayment.paymentType === "echannel"
              ? "TRANSFER"
              : "OTHER";

      const order = await tx.order.create({
        data: {
          customerId: schedule.customerId,
          kapsterId: schedule.kapsterId,
          createdById: req.user!.id,
          checkInAt: now,
          serviceStatus: "WAITING",
          paymentStatus: "PAID",

          // Gunakan harga dan diskon saat booking dibuat.
          subtotal: currentBooking.subtotal,
          discountPercent: currentBooking.discountPercent,
          discount: currentBooking.discount,
          total: currentBooking.total,
          notes: currentBooking.notes,

          items: {
            create: currentBooking.items.map((item) => ({
              serviceId: item.serviceId,
              serviceName: item.serviceName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              duration: item.duration,
            })),
          },

          payment: {
            create: {
              bookingPaymentId: paidPayment.id,
              amount: paidPayment.amount,
              method,
              amountReceived: paidPayment.amount,
              change: 0,
              paidAt: paidPayment.paidAt!,

              // Pembayaran diterima online, bukan oleh staff yang check-in.
              receivedById: null,
            },
          },

          statusHistories: {
            create: {
              fromStatus: null,
              toStatus: "WAITING",
              changedById: req.user!.id,
            },
          },
        },
      });

      // Hubungkan dengan jadwal yang sudah dipesan.
      // Waktu reservasi tetap dipertahankan.
      await tx.schedule.update({
        where: {
          id: schedule.id,
        },
        data: {
          orderId: order.id,
        },
      });

      const createdOrder = await tx.order.findUniqueOrThrow({
        where: {
          id: order.id,
        },
        include: {
          items: true,
          payment: true,
          schedule: true,
        },
      });

      return {
        success: true as const,
        order: createdOrder,
      };
    });

    if (!transactionResult.success) {
      return res.status(transactionResult.statusCode).json({
        message: transactionResult.message,
      });
    }

    // Check-in dan order sudah berhasil disimpan.
    notifyBookingChanged(transactionResult.order.customerId);
    notifyOrdersChanged();

    return res.status(201).json({
      message: "Kedatangan customer berhasil dicatat dan order sudah dibuat.",
      data: transactionResult.order,
    });
  } catch (error) {
    next(error);
  }
};
