# RacerCalendar

Curated motorsport calendars with ICS / Webcal links, optional user Google OAuth calendar push, and a shared Google Calendar sync path for subscribers.

Requires **PostgreSQL** (Prisma) and **Next.js 16**.

## Quick start

```bash
cp .env.example .env.local # fill DATABASE_URL + secrets listed below
npm install
npx prisma migrate deploy
npm run db:seed            # WIPES every Series and imports data/f1-2026.snapshot.json
npm run dev
```

> The seed is a destructive full-replace from the checked-in F1 2026 snapshot. There is no
> demo data — running `db:seed` puts the real calendar in. Regenerate the snapshot from the
> typed table with `npm run build:f1-2026` if a round shifts.

Open [`http://localhost:3000`](http://localhost:3000).

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string (`sslmode=require` on hosted DBs). |
| `CALENDAR_FEED_SECRET` | ≥16 chars, signs personalized feed tokens (`/api/calendar/sign`). |
| `SESSION_SECRET` | Session/crypto helper for OAuth & cookies stack. |
| `APP_ORIGIN` / `NEXT_PUBLIC_APP_ORIGIN` | Canonical site URL (`https://…` in prod — drives metadata + ICS links). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional OAuth Gmail sync. |
| `CRON_SECRET` | Protects cron hits to `/api/calendar/service-sync`. |
| `RACERCALENDAR_SERVICE_SYNC_SECRET` | Optional alternate manual bearer for sync. |
| `RACERCALENDAR_ADMIN_SECRET` | Protects **`POST /api/admin/import-snapshot`** (JSON ingestion). Never commit raw secrets. |

See [.env.example](.env.example) for commentary on Google **service-account** calendars.

## Bringing real race data online

Two ingestion paths, both feeding the same validator (`src/lib/ingest/upsert-snapshot.ts`):

1. **Curated snapshot file** (used by the F1 2026 calendar shipped in this repo):

   - Source of truth: [scripts/build-f1-2026-snapshot.ts](scripts/build-f1-2026-snapshot.ts) — a typed table of every round (slug, venue, IANA timezone, race UTC start, weekend window).
   - Run `npm run build:f1-2026` to regenerate `data/f1-2026.snapshot.json`.
   - The JSON shape matches [data/example.snapshot.json](data/example.snapshot.json).

2. **Any other JSON snapshot**: build a `{ "series": [ … ] }` bundle following the same shape.

### Pushing data to a deployed instance

```bash
curl -fsS \
  -H "Authorization: Bearer $RACERCALENDAR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  --data @./data/f1-2026.snapshot.json \
  "$NEXT_PUBLIC_APP_ORIGIN/api/admin/import-snapshot"
```

### Locally (or from a CI box with `DATABASE_URL` set)

```bash
RACERCALENDAR_ADMIN_SECRET="$RACERCALENDAR_ADMIN_SECRET" \
  npm run import:snapshot -- ./data/f1-2026.snapshot.json
```

### Destructive replace vs additive upsert

Set `"replace": true` at the top of the bundle (the F1 2026 snapshot does this) to wipe **all**
existing `Series` rows (cascading to events / sessions / watch options) inside the same
transaction before the upsert runs. Omit the flag (or set `false`) for the default
slug-by-slug upsert. `npm run db:seed` always forces replace semantics — it is operator
intent to reset to the snapshot.

### Attribution / housekeeping

- `Series.dataSourceUrl`, `licenseNotes`, `Session.dataSourceUrl` persist for disclosures.
- Mark stale watch descriptors with **`WatchOption.archived: true`** via re-import — they're filtered from feeds/sync.

Cron still hits `/api/calendar/service-sync` daily (configure service account vars) once data exists.

## Operations

- **`GET /api/health`** — JSON readiness (`db`: up/down, latency ms). Ping from uptime bots.
- **Structured logs**: `console` lines stringify JSON payloads from `src/lib/logger.ts`; wire Vercel log drains downstream for alerts.
- **Staging**: Duplicate env with a Neon/Supabase *staging* database; keep `DATABASE_URL` preview-only away from prod credentials.

## Build & deploy (Vercel)

`npm run build` runs **`prisma generate` → `migrate deploy` → `next build`**.

1. Provision Postgres (`DATABASE_URL` secret).  
2. Set **`CALENDAR_FEED_SECRET`** + **`SESSION_SECRET`**.  
3. Optional Google paths (OAuth + optional service-account JSON/env split).  
4. Configure **`CRON_SECRET`** referenced by cron + manual curl snippets.  

## Legal-ish pages bundled

- [/privacy](/privacy) / [/terms](/terms) — customise per deployment & jurisdiction before large-scale marketing.
- Landing footer links + coverage/preview reinforce transparency.

## Changelog summary

Tracked in-repository at [/changelog](/changelog); expand per fork.

---

MIT-style licensing is not assumed—add a `LICENSE` file if publishing publicly beyond your own deployment.
