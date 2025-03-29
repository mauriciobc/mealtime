-- CreateTable
CREATE TABLE "Notification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "catId" INTEGER,
    "householdId" INTEGER,
    "actionUrl" TEXT,
    "icon" TEXT,
    "timestamp" DATETIME,
    "data" TEXT,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Notification_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Notification_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_catId_idx" ON "Notification"("catId");

-- CreateIndex
CREATE INDEX "Notification_householdId_idx" ON "Notification"("householdId");
