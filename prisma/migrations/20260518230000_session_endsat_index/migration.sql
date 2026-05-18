-- Composite index supporting the hot-path feed/sign queries:
--   WHERE "endsAt" >= now() ORDER BY "startsAt" ASC
-- (see src/lib/session-query.ts, src/lib/session-preview.ts)
CREATE INDEX IF NOT EXISTS "Session_endsAt_startsAt_idx" ON "Session"("endsAt", "startsAt");
