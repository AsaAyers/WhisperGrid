-- CreateTable
CREATE TABLE "Backup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "backup" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Backup_id_key" ON "Backup"("id");
