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
  } catch {
    return NextResponse.json(
      { error: "Could not sign calendar payload." },
      { status: 500 },
    );
  }
}
