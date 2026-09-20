-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_service_id_fkey";

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
