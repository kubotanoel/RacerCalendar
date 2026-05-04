#!/usr/bin/env npx tsx
/**
 * Import a JSON snapshot bundle from disk into Postgres.
 * Usage: npx tsx scripts/import-snapshot.ts ./path/to/snapshot.json
 */
import { readFile } from "node:fs/promises";

import { upsertSnapshotFromJson } from "../src/lib/ingest/upsert-snapshot";
import { prisma } from "../src/lib/prisma";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npx tsx scripts/import-snapshot.ts <snapshot.json>");
    process.exit(1);
  }
  const raw = await readFile(file, "utf8");
  let json: unknown;
  try {
    json = JSON.parse(raw) as unknown;
  } catch {
    console.error("Invalid JSON file");
    process.exit(1);
  }
  const r = await upsertSnapshotFromJson(json);
  console.log(JSON.stringify({ ok: true, ...r }, null, 2));
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
