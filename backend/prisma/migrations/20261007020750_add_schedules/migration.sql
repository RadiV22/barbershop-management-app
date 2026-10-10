-- CreateEnum
CREATE TYPE "ScheduleSource" AS ENUM ('ONLINE', 'WALK_IN');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('HELD', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "schedules" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "kapster_id" INTEGER NOT NULL,
    "order_id" INTEGER,
    "source" "ScheduleSource" NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'HELD',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "blocked_until" TIMESTAMP(3) NOT NULL,
    "hold_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schedules_order_id_key" ON "schedules"("order_id");

-- CreateIndex
CREATE INDEX "schedules_customer_id_idx" ON "schedules"("customer_id");

-- CreateIndex
CREATE INDEX "schedules_kapster_id_starts_at_idx" ON "schedules"("kapster_id", "starts_at");

-- CreateIndex
CREATE INDEX "schedules_status_hold_expires_at_idx" ON "schedules"("status", "hold_expires_at");

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_kapster_id_fkey" FOREIGN KEY ("kapster_id") REFERENCES "kapsters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
