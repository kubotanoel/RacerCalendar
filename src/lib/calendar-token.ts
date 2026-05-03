import { createHmac, timingSafeEqual } from "crypto";
import type { Category } from "@prisma/client";

export type FeedPayload = {
  /** Category enum values or empty means all */
  categories: Category[];
  freeOnly: boolean;
};

function getSecret(): string {
  const s = process.env.CALENDAR_FEED_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("CALENDAR_FEED_SECRET must be set (min 16 chars)");
  }
  return "dev-insecure-cal-feed-change-me!";
}

export function signFeedPayload(payload: FeedPayload): string {
  const secret = getSecret();
  const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyFeedToken(token: string): FeedPayload | null {
  try {
    const secret = getSecret();
    const idx = token.lastIndexOf(".");
    if (idx <= 0) return null;
    const data = token.slice(0, idx);
    const sig = token.slice(idx + 1);
    const expected = createHmac("sha256", secret).update(data).digest("base64url");
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
