import { createHmac, timingSafeEqual } from "crypto";
import type { Category } from "@prisma/client";

export type FeedPayload = {
  /** Category enum values or empty means all */
  categories: Category[];
  freeOnly: boolean;
};

const DEV_FALLBACK = "dev-insecure-cal-feed-change-me!" as const;

const MIN_SECRET_LEN = 16;

function normalizeSecret(raw: string | undefined): string {
  return (raw ?? "").trim();
}

type ResolvedSecret = { configured: true; secret: string } | { configured: false };

/** Use for Route Handlers: avoid throwing; surface a clear prod error. */
export function resolveCalendarFeedSecret(): ResolvedSecret {
  const s = normalizeSecret(process.env.CALENDAR_FEED_SECRET);
  if (s.length >= MIN_SECRET_LEN) return { configured: true, secret: s };

  const isDeployed =
    process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  if (!isDeployed) {
    return { configured: true, secret: DEV_FALLBACK };
  }
  return { configured: false };
}

export function calendarFeedMisconfigurationMessage(): string {
  const isVercel = process.env.VERCEL === "1";
  if (isVercel) {
    return (
      "Set CALENDAR_FEED_SECRET in Vercel (Project → Settings → Environment Variables). " +
      "Use Production (and Preview if you use preview URLs); value must be at least " +
      `${MIN_SECRET_LEN} characters after trimming. Then redeploy.`
    );
  }
  return (
    `Set CALENDAR_FEED_SECRET in your environment (min ${MIN_SECRET_LEN} chars).`
  );
}

export function signFeedPayload(payload: FeedPayload): string {
  const r = resolveCalendarFeedSecret();
  if (!r.configured) {
    throw new Error("CALENDAR_FEED_SECRET not configured");
  }
  const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", r.secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyFeedToken(token: string): FeedPayload | null {
  try {
    const r = resolveCalendarFeedSecret();
    if (!r.configured) return null;
    const idx = token.lastIndexOf(".");
    if (idx <= 0) return null;
    const data = token.slice(0, idx);
    const sig = token.slice(idx + 1);
    const expected = createHmac("sha256", r.secret).update(data).digest("base64url");
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8"),
    ) as FeedPayload;
    if (!parsed || typeof parsed.freeOnly !== "boolean") return null;
    if (!Array.isArray(parsed.categories)) return null;
    return parsed;
  } catch {
    return null;
  }
}
