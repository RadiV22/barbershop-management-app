/*
  Warnings:

  - A unique constraint covering the columns `[booking_payment_id]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "booking_payment_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "payments_booking_payment_id_key" ON "payments"("booking_payment_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_payment_id_fkey" FOREIGN KEY ("booking_payment_id") REFERENCES "booking_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
