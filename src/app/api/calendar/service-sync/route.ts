import { Category } from "@prisma/client";
import { NextResponse } from "next/server";

import { loadServiceAccountCredentials } from "@/lib/google/service-credentials";
import { upsertSessionsToServiceCalendar } from "@/lib/google/service-calendar-sync";
import { querySessionsForFeed } from "@/lib/session-query";

export const runtime = "nodejs";

const ALLOWED: readonly Category[] = [
  Category.FORMULA,
  Category.SPORTSCAR,
  Category.STOCK_CAR,
  Category.MOTORCYCLE,
  Category.RALLY,
  Category.OTHER,
];
const ALLOWED_SET = new Set<string>(ALLOWED);

/** Vercel Cron sends Bearer CRON_SECRET; manual runs may use RACERCALENDAR_SERVICE_SYNC_SECRET. */
function authorizeServiceCalendarSync(req: Request): boolean {
  const raw = req.headers.get("authorization");
  const m = /^Bearer\s+(.+)$/i.exec(raw ?? "");
  const token = m?.[1]?.trim() ?? "";
  if (!token) return false;
  const cron = process.env.CRON_SECRET?.trim();
  const manual = process.env.RACERCALENDAR_SERVICE_SYNC_SECRET?.trim();
  if (cron && token === cron) return true;
  if (manual && token === manual) return true;
  return false;
}

async function handleSync(req: Request) {
  if (!authorizeServiceCalendarSync(req)) {
    return NextResponse.json(
      { error: "Unauthorized — set CRON_SECRET or RACERCALENDAR_SERVICE_SYNC_SECRET and send Authorization: Bearer …" },
      { status: 401 },
    );
  }

  if (!loadServiceAccountCredentials()) {
    return NextResponse.json(
      {
        error:
          "Service account not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON (or EMAIL + PRIVATE_KEY).",
      },
      { status: 503 },
    );
  }

  let body: unknown = {};
  if (req.method === "POST") {
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
  }

  const rawCatsUnknown =
    typeof body === "object" &&
    body !== null &&
    "categories" in body &&
    Array.isArray((body as { categories?: unknown }).categories)
      ? (body as { categories: unknown[] }).categories
      : [];
  const categories = rawCatsUnknown.filter(
    (c: unknown): c is Category => typeof c === "string" && ALLOWED_SET.has(c),
  );

  const freeOnly =
    typeof body === "object" &&
    body !== null &&
    "freeOnly" in body &&
    typeof (body as { freeOnly?: unknown }).freeOnly === "boolean" ?
      (body as { freeOnly: boolean }).freeOnly
    : false;

  const payload = {
    categories,
    /** Default public calendar mirrors full DB (filters opt-in via POST JSON). */
    freeOnly,
  };

  try {
    const sessions = await querySessionsForFeed(payload);
    const result = await upsertSessionsToServiceCalendar(sessions);

    return NextResponse.json({
      ok: true,
      sessions: sessions.length,
      inserted: result.inserted,
      deletedApprox: result.deletedApprox,
      calendarId: result.calendarId,
      payloadApplied: payload,
    });
  } catch (cause) {
    console.error("[api/calendar/service-sync]", cause);
    const msg =
      cause instanceof Error ? cause.message : "Service calendar sync failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return handleSync(req);
}

export async function POST(req: Request) {
  return handleSync(req);
}
