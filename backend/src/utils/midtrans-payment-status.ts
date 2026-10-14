import type { BookingPaymentStatus } from "../generated/prisma/client.js";

interface PaymentStatusResult {
  status: BookingPaymentStatus;
  needsReview: boolean;
  reviewReason: string | null;
}

export function mapMidtransPaymentStatus(
  transactionStatus: string,
  fraudStatus?: string,
): PaymentStatusResult {
  function normal(status: BookingPaymentStatus): PaymentStatusResult {
    return {
      status,
      needsReview: false,
      reviewReason: null,
    };
  }

  function review(reason: string): PaymentStatusResult {
    return {
      status: "REVIEW",
      needsReview: true,
      reviewReason: reason,
    };
  }

  switch (transactionStatus) {
    case "settlement":
      if (fraudStatus !== undefined && fraudStatus !== "accept") {
        return review(
          "Status settlement memiliki hasil pemeriksaan fraud yang tidak sesuai.",
        );
      }

      return normal("PAID");

    case "capture":
      if (fraudStatus === "accept") {
        return normal("PAID");
      }

      return review(
        "Pembayaran kartu belum memiliki hasil pemeriksaan fraud accept.",
      );

    case "pending":
      return normal("PENDING");

    case "expire":
      return normal("EXPIRED");

    case "cancel":
      return normal("CANCELLED");

    case "deny":
    case "failure":
      return normal("FAILED");

    case "refund":
      return {
        status: "REFUNDED",
        needsReview: true,
        reviewReason: "Pembayaran dikembalikan. Periksa tindak lanjut booking.",
      };

    case "partial_refund":
      return {
        status: "PARTIALLY_REFUNDED",
        needsReview: true,
        reviewReason:
          "Pembayaran dikembalikan sebagian. Periksa tindak lanjut booking.",
      };

    default:
      return review(
        `Status Midtrans memerlukan pemeriksaan: ${transactionStatus}`,
      );
  }
}
