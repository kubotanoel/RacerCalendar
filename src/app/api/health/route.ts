import { NextResponse } from "next/server";

import { logEvent } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Lightweight readiness check (DB reachable). Optionally hit periodically from uptime monitors.
 */
/**
 * Always logs full stack to the server logger. Only returns a generic "down" marker
 * in the JSON body so the public probe doesn't leak internal paths, query strings,
 * or Prisma version data. In non-production envs we surface the message (no stack)
 * so local debugging stays painless.
 */
export async function GET() {
  const t0 = Date.now();
  let ok = false;
  let detailFull: string | undefined;
  let detailPublic: string | undefined;
  try {
    await prisma.$queryRaw`SELECT 1`;
    ok = true;
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : String(cause);
    detailFull =
      cause instanceof Error ? `${msg}\n${cause.stack ?? ""}` : msg;
    detailPublic = process.env.NODE_ENV === "production" ? "db_probe_failed" : msg;
    logEvent("health", "error", "db_probe_failed", { detail: detailFull });
  }
  const latencyMs = Date.now() - t0;
  const payload = {
    ok,
    db: ok ? ("up" as const) : ("down" as const),
    latencyMs,
    ...(detailPublic ? { error: detailPublic } : {}),
    t: new Date().toISOString(),
  };
  return NextResponse.json(payload, { status: ok ? 200 : 503 });
}
