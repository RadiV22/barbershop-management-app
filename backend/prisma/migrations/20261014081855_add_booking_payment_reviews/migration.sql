-- CreateTable
CREATE TABLE "booking_payment_reviews" (
    "id" SERIAL NOT NULL,
    "booking_payment_id" INTEGER NOT NULL,
    "reviewed_by_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "previous_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_payment_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_payment_reviews_booking_payment_id_created_at_idx" ON "booking_payment_reviews"("booking_payment_id", "created_at");

-- CreateIndex
CREATE INDEX "booking_payment_reviews_reviewed_by_id_idx" ON "booking_payment_reviews"("reviewed_by_id");

-- AddForeignKey
ALTER TABLE "booking_payment_reviews" ADD CONSTRAINT "booking_payment_reviews_booking_payment_id_fkey" FOREIGN KEY ("booking_payment_id") REFERENCES "booking_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_payment_reviews" ADD CONSTRAINT "booking_payment_reviews_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
