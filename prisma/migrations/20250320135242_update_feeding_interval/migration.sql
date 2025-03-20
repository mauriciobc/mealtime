-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Cat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,
    "birthdate" DATETIME,
    "weight" REAL,
    "restrictions" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "householdId" INTEGER NOT NULL,
    "feeding_interval" INTEGER NOT NULL DEFAULT 8,
    "portion_size" REAL DEFAULT 0,
    CONSTRAINT "Cat_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Cat" ("birthdate", "createdAt", "feeding_interval", "householdId", "id", "name", "notes", "photoUrl", "portion_size", "restrictions", "updatedAt", "weight") SELECT "birthdate", "createdAt", coalesce("feeding_interval", 8) AS "feeding_interval", "householdId", "id", "name", "notes", "photoUrl", "portion_size", "restrictions", "updatedAt", "weight" FROM "Cat";
DROP TABLE "Cat";
ALTER TABLE "new_Cat" RENAME TO "Cat";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
