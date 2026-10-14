-- CreateEnum
CREATE TYPE "BookingPaymentStatus" AS ENUM ('CREATED', 'PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'REVIEW');

-- CreateTable
CREATE TABLE "booking_payments" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "merchant_order_id" TEXT NOT NULL,
    "transaction_id" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "status" "BookingPaymentStatus" NOT NULL DEFAULT 'CREATED',
    "snap_token" TEXT,
    "redirect_url" TEXT,
    "payment_type" TEXT,
    "provider_status" TEXT,
    "fraud_status" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "review_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "booking_payments_merchant_order_id_key" ON "booking_payments"("merchant_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "booking_payments_transaction_id_key" ON "booking_payments"("transaction_id");

-- CreateIndex
CREATE INDEX "booking_payments_booking_id_status_idx" ON "booking_payments"("booking_id", "status");

-- CreateIndex
CREATE INDEX "booking_payments_status_expires_at_idx" ON "booking_payments"("status", "expires_at");

-- AddForeignKey
ALTER TABLE "booking_payments" ADD CONSTRAINT "booking_payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
