import { NextResponse } from "next/server";

import { googleCalendarAddHref } from "@/lib/google/google-calendar-subscribe-links";
import { loadServiceAccountCredentials } from "@/lib/google/service-credentials";
import { prisma } from "@/lib/prisma";
import { parseRcSession, SESSION_COOKIE } from "@/lib/rc-session";

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

export async function GET(req: Request) {
  const cookie = parseRcSession(cookiesFromRequest(req).get(SESSION_COOKIE));
  const googleConfigured =
    !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
  const serviceAccountReady = !!loadServiceAccountCredentials();

  let calendarId: string | null = null;
  try {
    const serviceRow = await prisma.serviceCalendarState.findUnique({
      where: { id: "default" },
      select: { calendarId: true },
    });
    calendarId = serviceRow?.calendarId ?? null;
  } catch (e) {
    console.warn("[api/auth/status] service calendar row unavailable", e);
  }
  const subscribeHref = calendarId ? googleCalendarAddHref(calendarId) : null;

  let email: string | undefined;
  if (cookie) {
    const acc = await prisma.googleAccount.findUnique({
      where: { id: cookie.accountId },
      select: { email: true },
    });
    email = acc?.email;
  }

  return NextResponse.json({
    googleConfigured,
    signedIn: !!cookie && !!email,
    email: email ?? null,
    googleServiceCalendar: {
      credentialsConfigured: serviceAccountReady,
      calendarId,
      subscribeHref,
    },
  });
}
