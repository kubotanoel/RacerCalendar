import { NextResponse } from "next/server";

import { logEvent } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Lightweight readiness check (DB reachable). Optionally hit periodically from uptime monitors.
 */
export async function GET() {
  const t0 = Date.now();
  let ok = false;
  let detail: string | undefined;
  try {
    await prisma.$queryRaw`SELECT 1`;
    ok = true;
  } catch (cause) {
    detail =
      cause instanceof Error ? `${cause.message}\n${cause.stack ?? ""}` : String(cause);
    logEvent("health", "error", "db_probe_failed", { detail });
  }
  const latencyMs = Date.now() - t0;
  const payload = {
    ok,
    db: ok ? ("up" as const) : ("down" as const),
    latencyMs,
    ...(detail ? { error: detail } : {}),
    t: new Date().toISOString(),
  };
  return NextResponse.json(payload, { status: ok ? 200 : 503 });
}
