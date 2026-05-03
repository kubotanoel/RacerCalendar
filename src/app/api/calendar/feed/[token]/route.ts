import { NextResponse } from "next/server";

import { verifyFeedToken } from "@/lib/calendar-token";
import { serializeIcsCalendar } from "@/lib/ics";
import { querySessionsForFeed } from "@/lib/session-query";

type RouteContext = { params: Promise<{ token: string }> };

export const runtime = "nodejs";

export async function GET(_req: Request, context: RouteContext) {
  const { token: raw } = await context.params;
  const token = decodeURIComponent(raw);
  const payload = verifyFeedToken(token);
  if (!payload) {
    return new NextResponse("Invalid calendar link", { status: 403 });
  }

  const sessions = await querySessionsForFeed(payload);
  const body = serializeIcsCalendar(sessions);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, max-age=300",
    },
  });
}
