-- Adds liveCoverage flag so "Only free streams" can distinguish full free-live broadcasts
-- (e.g. NLS, ADAC 24h on YouTube) from free-but-highlights-only feeds (e.g. F1 YouTube).
-- Backfill defaults to TRUE for every existing row; ingestion code re-marks highlight-only
-- rows to FALSE on the next snapshot import.
ALTER TABLE "WatchOption"
  ADD COLUMN "liveCoverage" BOOLEAN NOT NULL DEFAULT true;
