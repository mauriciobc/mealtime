-- Migration: Normalize household member roles to lowercase and enforce with enum
-- This migration addresses inconsistent role casing (admin/ADMIN, member/MEMBER)

-- Step 1: Normalize all existing role values to lowercase
UPDATE "public"."household_members"
SET role = LOWER(role)
WHERE role != LOWER(role);

-- Step 2: Create enum type for household roles
CREATE TYPE "public"."household_role" AS ENUM ('admin', 'member');

-- Step 3: Alter the column to use the new enum type
-- We use USING clause to cast the text to enum
ALTER TABLE "public"."household_members"
ALTER COLUMN "role" TYPE "public"."household_role"
USING role::"public"."household_role";

-- Step 4: Add a comment for documentation
COMMENT ON TYPE "public"."household_role" IS 'Valid roles for household members: admin (full permissions) or member (standard permissions)';

