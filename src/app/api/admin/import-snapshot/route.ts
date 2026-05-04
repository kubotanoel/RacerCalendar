import { NextResponse } from "next/server";

import { upsertSnapshotFromJson } from "@/lib/ingest/upsert-snapshot";
import { logEvent } from "@/lib/logger";

export const runtime = "nodejs";

/** Bearer RACERCALENDAR_ADMIN_SECRET — same pattern as cron protected routes */
function authorize(req: Request): boolean {
  const secret = process.env.RACERCALENDAR_ADMIN_SECRET?.trim();
  if (!secret) return false;
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "");
  return !!(m?.[1] && m[1].trim() === secret);
}

export async function POST(req: Request) {
  if (!process.env.RACERCALENDAR_ADMIN_SECRET?.trim()) {
    return NextResponse.json(
      { error: "RACERCALENDAR_ADMIN_SECRET not configured on server" },
      { status: 503 },
    );
  }
  if (!authorize(req)) {
    logEvent("admin.import-snapshot", "warn", "unauthorized_attempt");
    return NextResponse.json(
      {
        error:
          "Send Authorization: Bearer <RACERCALENDAR_ADMIN_SECRET> (set in env; never commit secrets)",
      },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  try {
    const result = await upsertSnapshotFromJson(body);
    logEvent("admin.import-snapshot", "info", "ingest_complete", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : String(cause);
    logEvent("admin.import-snapshot", "error", "ingest_failed", { detail: msg });
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
