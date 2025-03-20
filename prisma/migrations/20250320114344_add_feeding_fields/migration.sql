-- AlterTable
ALTER TABLE "Cat" ADD COLUMN "feeding_interval" INTEGER DEFAULT 8;
ALTER TABLE "Cat" ADD COLUMN "portion_size" REAL DEFAULT 0;

-- AlterTable
ALTER TABLE "FeedingLog" ADD COLUMN "status" TEXT DEFAULT 'completed';
