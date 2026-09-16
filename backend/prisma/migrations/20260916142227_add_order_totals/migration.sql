BEGIN;

-- 1. Tambahkan kolom.
ALTER TABLE "orders"
ADD COLUMN "discount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "discount_percent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "subtotal" INTEGER,
ADD COLUMN "total" INTEGER;

-- 2. Hitung subtotal transaksi lama dari harga snapshot item.
UPDATE "orders" AS o
SET "subtotal" = COALESCE(
    (
        SELECT SUM(oi."quantity"::BIGINT * oi."unit_price")
        FROM "order_items" AS oi
        WHERE oi."order_id" = o."id"
    ),
    0
);

-- 3. Order lama belum menggunakan diskon.
UPDATE "orders"
SET "total" = "subtotal";

-- 4. Setelah semua baris terisi, jadikan kolom wajib.
ALTER TABLE "orders"
ALTER COLUMN "subtotal" SET NOT NULL,
ALTER COLUMN "total" SET NOT NULL;

COMMIT;