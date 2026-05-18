/**
 * Database seed.
 *
 * Behavior: full-replace from data/f1-2026.snapshot.json.
 * Running `npm run db:seed` wipes every existing Series (cascades to Events / Sessions /
 * WatchOptions) and then imports the real F1 2026 calendar via the same code path used by
 * POST /api/admin/import-snapshot.
 *
 * If the snapshot file is missing, the seed exits cleanly without touching the DB so an
 * accidentally-run seed cannot delete production data. To regenerate the snapshot file:
 *
 *     npx tsx scripts/build-f1-2026-snapshot.ts
 */
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import { upsertSnapshotFromJson } from "../src/lib/ingest/upsert-snapshot";
import { prisma } from "../src/lib/prisma";

const SNAPSHOT_PATH = resolve(__dirname, "..", "data", "f1-2026.snapshot.json");

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await fileExists(SNAPSHOT_PATH))) {
    console.warn(
      `[seed] Snapshot not found at ${SNAPSHOT_PATH}. Generate it first:\n` +
        "       npx tsx scripts/build-f1-2026-snapshot.ts\n" +
        "[seed] Skipping seed; database left untouched.",
    );
    return;
  }

  const raw = await readFile(SNAPSHOT_PATH, "utf8");
  let bundle: unknown;
  try {
    bundle = JSON.parse(raw);
  } catch (cause) {
    throw new Error(
      `[seed] ${SNAPSHOT_PATH} is not valid JSON: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }

  // Force replace semantics for the seed entry point regardless of what's in the file —
  // `npm run db:seed` is explicit operator intent to reset the DB to the snapshot.
  if (bundle && typeof bundle === "object") {
    (bundle as Record<string, unknown>).replace = true;
  }

  const result = await upsertSnapshotFromJson(bundle);
  console.log(
    `[seed] replaced=${result.replaced} deletedSeries=${result.seriesDeleted} ` +
      `series=${result.seriesUpserted} events=${result.eventsUpserted} sessions=${result.sessionsUpserted}`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
