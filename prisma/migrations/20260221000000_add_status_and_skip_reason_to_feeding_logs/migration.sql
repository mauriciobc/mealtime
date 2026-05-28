-- Add status and skip_reason to feeding_logs for Flutter complete/skip feature
ALTER TABLE "public"."feeding_logs" 
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'completed',
  ADD COLUMN "skip_reason" TEXT;

-- Index for querying by status
CREATE INDEX IF NOT EXISTS idx_feeding_logs_status ON "public"."feeding_logs"("status");
