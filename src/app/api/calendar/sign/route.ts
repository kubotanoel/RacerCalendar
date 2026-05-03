import { Category } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  calendarFeedMisconfigurationMessage,
  resolveCalendarFeedSecret,
  signFeedPayload,
} from "@/lib/calendar-token";
import { querySessionsForFeed } from "@/lib/session-query";

const ALLOWED: readonly Category[] = [
  Category.FORMULA,
  Category.SPORTSCAR,
  Category.STOCK_CAR,
  Category.MOTORCYCLE,
  Category.RALLY,
  Category.OTHER,
];

const ALLOWED_SET = new Set<string>(ALLOWED);

export const runtime = "nodejs";

function signFailureResponse(cause: unknown) {
  console.error("[api/calendar/sign]", cause);

  const msg =
    cause instanceof Error
      ? `${cause.message}\n${cause.stack ?? ""}`
      : typeof cause === "string"
        ? cause
        : `Unknown: ${String(cause)}`;

  const m = msg.toLowerCase();
  const prismaCode =
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    typeof (cause as { code: unknown }).code === "string"
      ? (cause as { code: string }).code
      : "";

  const looksDb =
    prismaCode.startsWith("P") ||
    m.includes("prisma") ||
    m.includes("database") ||
    m.includes("sql") ||
    m.includes("connect econnrefused") ||
    m.includes("can't reach database") ||
    m.includes("does not exist") ||
    m.includes("enoent") ||
    m.includes("sqlite");

  if (looksDb) {
    return NextResponse.json(
      {
        error:
          "We couldn’t read the race database. If you run this on Vercel: set DATABASE_URL to Postgres (or another persistent DB), run “prisma migrate deploy”, then “prisma db seed” once. SQLite on the default file path usually fails in production.",
        code: "database_unavailable",
      },
      { status: 503 },
    );
  }

  if (m.includes("calendar_feed_secret") || m.includes("not configured")) {
    return NextResponse.json(
      { error: calendarFeedMisconfigurationMessage(), code: "secret" },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      error:
        "Couldn’t create your calendar link. Refresh the page; if it keeps happening, check host logs (Vercel → Logs).",
      code: "unknown",
    },
    { status: 500 },
  );
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("freeOnly" in raw) ||
    typeof (raw as { freeOnly: unknown }).freeOnly !== "boolean"
  ) {
    return NextResponse.json(
      { error: "Body must include categories string[] (optional) and freeOnly boolean" },
      { status: 400 },
    );
  }
  const cats = (raw as { categories?: unknown }).categories;
  const categories =
    Array.isArray(cats) ?
      cats.filter(
        (c): c is Category =>
          typeof c === "string" && ALLOWED_SET.has(c),
      )
    : [];

  const payload = {
    categories,
    freeOnly: (raw as { freeOnly: boolean }).freeOnly,
  };

  if (!resolveCalendarFeedSecret().configured) {
    return NextResponse.json(
      { error: calendarFeedMisconfigurationMessage() },
      { status: 503 },
    );
  }

  try {
    const sessions = await querySessionsForFeed(payload);
    const token = signFeedPayload(payload);
    return NextResponse.json({
      token,
      sessionCount: sessions.length,
    });
  } catch (cause) {
    return signFailureResponse(cause);
  }
}
