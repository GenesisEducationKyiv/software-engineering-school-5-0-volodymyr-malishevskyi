/*
  Warnings:

  - You are about to drop the column `city` on the `Subscription` table. All the data in the column will be lost.
  - Added the required column `city_id` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `frequency` on the `Subscription` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "SubscriptionFrequency" AS ENUM ('daily', 'hourly');

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "city",
ADD COLUMN     "city_id" INTEGER NOT NULL,
DROP COLUMN "frequency",
ADD COLUMN     "frequency" "SubscriptionFrequency" NOT NULL;

-- CreateTable
CREATE TABLE "City" (
    "id" SERIAL NOT NULL,
    "external_id" INTEGER,
    "full_name" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "City_external_id_key" ON "City"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "City_name_key" ON "City"("name");

-- CreateIndex
CREATE INDEX "city_name_index" ON "City"("name");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
