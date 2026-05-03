import { NextResponse } from "next/server";

import { verifyFeedToken } from "@/lib/calendar-token";
import { upsertSessionsToCalendar } from "@/lib/google/calendar-sync";
import { parseRcSession, SESSION_COOKIE } from "@/lib/rc-session";
import { querySessionsForFeed } from "@/lib/session-query";

export async function POST(req: Request) {
  const cookie = parseRcSession(
    (await cookiesFromRequest(req)).get(SESSION_COOKIE),
  );
  if (!cookie) {
    return NextResponse.json(
      { error: "Not signed in with Google. Connect first." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const feedToken =
    typeof body === "object" &&
    body !== null &&
    "feedToken" in body &&
    typeof (body as { feedToken: unknown }).feedToken === "string"
      ? (body as { feedToken: string }).feedToken
      : null;
  if (!feedToken) {
    return NextResponse.json({ error: "feedToken required" }, { status: 400 });
  }

  const payload = verifyFeedToken(feedToken);
  if (!payload) {
    return NextResponse.json({ error: "Invalid feed token" }, { status: 403 });
  }

  const sessions = await querySessionsForFeed(payload);
  const result = await upsertSessionsToCalendar(cookie.accountId, sessions);

  return NextResponse.json({
    ok: true,
    sessions: sessions.length,
    inserted: result.inserted,
    calendarId: result.calendarId,
    deletedApprox: result.deletedApprox,
  });
}

/** Read cookies from Request (edge-safe) without next/headers */
function cookiesFromRequest(req: Request): Map<string, string> {
  const map = new Map<string, string>();
  const raw = req.headers.get("cookie");
  if (!raw) return map;
  for (const part of raw.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (!name) continue;
    map.set(name, decodeURIComponent(rest.join("=")));
  }
  return map;
}
