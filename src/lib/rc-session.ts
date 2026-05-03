import { createHmac, timingSafeEqual } from "crypto";

export type CookiePayload = {
  accountId: string;
  /** Unix ms */
  exp: number;
};

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set (min 16 chars)");
  }
  return "dev-session-secret!";
}

/** 30-day session */
export const SESSION_COOKIE = "racercalendar_rc";
export const SESSION_MAX_MS = 30 * 24 * 60 * 60 * 1000;

export function sealRcSession(payload: CookiePayload): string {
  const secret = getSecret();
  const json = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(json).digest("base64url");
  return `${json}.${sig}`;
}

export function parseRcSession(cookie: string | undefined): CookiePayload | null {
  if (!cookie) return null;
  try {
    const secret = getSecret();
    const idx = cookie.lastIndexOf(".");
    if (idx <= 0) return null;
    const json = cookie.slice(0, idx);
    const sig = cookie.slice(idx + 1);
    const expected = createHmac("sha256", secret).update(json).digest("base64url");
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(
      Buffer.from(json, "base64url").toString("utf8"),
    ) as CookiePayload;
    if (!payload?.accountId || typeof payload.exp !== "number") return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
