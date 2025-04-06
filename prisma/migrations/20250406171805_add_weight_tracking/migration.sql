/*
  Warnings:

  - You are about to drop the `_HouseholdToUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_HouseholdToUser" DROP CONSTRAINT "_HouseholdToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "_HouseholdToUser" DROP CONSTRAINT "_HouseholdToUser_B_fkey";

-- AlterTable
ALTER TABLE "Cat" ADD COLUMN     "weightGoal" DOUBLE PRECISION;

-- DropTable
DROP TABLE "_HouseholdToUser";

-- CreateTable
CREATE TABLE "WeightMeasurement" (
    "id" SERIAL NOT NULL,
    "catId" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeightMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeightMeasurement_catId_idx" ON "WeightMeasurement"("catId");

-- CreateIndex
CREATE INDEX "WeightMeasurement_measuredAt_idx" ON "WeightMeasurement"("measuredAt");

-- AddForeignKey
ALTER TABLE "WeightMeasurement" ADD CONSTRAINT "WeightMeasurement_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
