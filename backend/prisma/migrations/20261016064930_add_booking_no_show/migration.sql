-- AlterEnum
ALTER TYPE "ScheduleStatus" ADD VALUE 'NO_SHOW';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "no_show_at" TIMESTAMP(3),
ADD COLUMN     "no_show_marked_by_id" INTEGER,
ADD COLUMN     "no_show_reason" TEXT;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_show_marked_by_id_fkey" FOREIGN KEY ("no_show_marked_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
