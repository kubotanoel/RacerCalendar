import { google } from "googleapis";
import { NextResponse } from "next/server";

import { getOAuthClient } from "@/lib/google/oauth";
import { prisma } from "@/lib/prisma";
import { sealRcSession, SESSION_COOKIE, SESSION_MAX_MS } from "@/lib/rc-session";

export async function GET(req: Request) {
  const origin = (
    process.env.APP_ORIGIN ??
    process.env.NEXT_PUBLIC_APP_ORIGIN ??
    "http://localhost:3000"
  ).replace(/\/$/, "");

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(
      `${origin}/?oauth=missing_config`,
    );
  }

  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(`${origin}/?oauth=denied`);
  }

  const code = url.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(`${origin}/?oauth=invalid`);
  }

  const oauth2Client = getOAuthClient();
  let tokens;
  try {
    const tr = await oauth2Client.getToken(code);
    tokens = tr.tokens;
  } catch {
    return NextResponse.redirect(`${origin}/?oauth=token_error`);
  }

  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  const sub = data.id;
  const email = data.email;
  if (!sub || !email) {
    return NextResponse.redirect(`${origin}/?oauth=no_user`);
  }

  const refreshToken = tokens.refresh_token ?? undefined;
  const account = await prisma.googleAccount.upsert({
    where: { googleSub: sub },
    create: {
      googleSub: sub,
      email,
      refreshToken: refreshToken ?? "",
    },
    update: {
      email,
      ...(refreshToken ? { refreshToken } : {}),
      accessToken: tokens.access_token ?? null,
      accessExpiry: tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : null,
    },
  });

  if (!account.refreshToken) {
    return NextResponse.redirect(
      `${origin}/?oauth=no_refresh_token`,
    );
  }

  const sealed = sealRcSession({
    accountId: account.id,
    exp: Date.now() + SESSION_MAX_MS,
  });

  const res = NextResponse.redirect(`${origin}/?oauth=ok`);
  res.cookies.set(SESSION_COOKIE, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
    maxAge: Math.floor(SESSION_MAX_MS / 1000),
  });
  return res;
}
