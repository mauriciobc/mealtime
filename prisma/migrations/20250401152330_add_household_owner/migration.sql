/*
  Warnings:

  - Added the required column `ownerId` to the `Household` table without a default value. This is not possible if the table is not empty.

*/
-- Step 1: Create the many-to-many relationship table if it doesn't exist
CREATE TABLE IF NOT EXISTS "_HouseholdToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_HouseholdToUser_AB_unique" UNIQUE ("A", "B")
);

CREATE INDEX IF NOT EXISTS "_HouseholdToUser_B_index" ON "_HouseholdToUser"("B");

ALTER TABLE IF EXISTS "_HouseholdToUser" 
ADD CONSTRAINT "_HouseholdToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "_HouseholdToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 2: Add the ownerId column as nullable first
ALTER TABLE "Household" ADD COLUMN "ownerId" INTEGER;

-- Step 3: Migrate existing relationships to the many-to-many table
INSERT INTO "_HouseholdToUser" ("A", "B")
SELECT h.id, u.id
FROM "Household" h
JOIN "User" u ON u."householdId" = h.id
ON CONFLICT ("A", "B") DO NOTHING;

-- Step 4: Update existing households to set their owner
-- For each household, set the owner to the first admin user in that household
WITH household_admins AS (
  SELECT DISTINCT ON (h.id)
    h.id as household_id,
    u.id as user_id,
    u.role as user_role
  FROM "Household" h
  JOIN "_HouseholdToUser" hu ON h.id = hu."A"
  JOIN "User" u ON u.id = hu."B"
  WHERE LOWER(u.role) = 'admin'
  ORDER BY h.id, u.id
)
UPDATE "Household" h
SET "ownerId" = ha.user_id
FROM household_admins ha
WHERE h.id = ha.household_id;

-- If any households still don't have an owner (no admin found),
-- set the owner to the first user in the household
WITH household_first_users AS (
  SELECT DISTINCT ON (h.id)
    h.id as household_id,
    u.id as user_id
  FROM "Household" h
  JOIN "_HouseholdToUser" hu ON h.id = hu."A"
  JOIN "User" u ON u.id = hu."B"
  WHERE h."ownerId" IS NULL
  ORDER BY h.id, u.id
)
UPDATE "Household" h
SET "ownerId" = hfu.user_id
FROM household_first_users hfu
WHERE h.id = hfu.household_id;

-- Step 5: Make the column required after setting all values
ALTER TABLE "Household" ALTER COLUMN "ownerId" SET NOT NULL;

-- Step 6: Add the foreign key constraint
ALTER TABLE "Household" ADD CONSTRAINT "Household_ownerId_fkey" 
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 7: Ensure all owners are also members of their households
INSERT INTO "_HouseholdToUser" ("A", "B")
SELECT h.id, h."ownerId"
FROM "Household" h
WHERE NOT EXISTS (
  SELECT 1 
  FROM "_HouseholdToUser" hu 
  WHERE hu."A" = h.id AND hu."B" = h."ownerId"
);
