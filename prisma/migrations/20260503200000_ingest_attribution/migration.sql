-- AlterTable
ALTER TABLE "Series" ADD COLUMN     "ingestSource" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "dataSourceUrl" TEXT,
ADD COLUMN     "licenseNotes" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "ingestSource" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "dataSourceUrl" TEXT;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "externalKey" TEXT,
ADD COLUMN     "dataSourceUrl" TEXT;

-- AlterTable
ALTER TABLE "WatchOption" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "Session_eventId_externalKey_key" ON "Session"("eventId", "externalKey");
