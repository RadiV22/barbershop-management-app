-- CreateTable
CREATE TABLE "memberships" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "member_code" TEXT NOT NULL,
    "discount_percent" INTEGER NOT NULL DEFAULT 10,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "memberships_customer_id_key" ON "memberships"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_member_code_key" ON "memberships"("member_code");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
