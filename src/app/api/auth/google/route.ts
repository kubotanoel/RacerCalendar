import { NextResponse } from "next/server";

import { getOAuthClient, GOOGLE_SCOPES } from "@/lib/google/oauth";

export async function GET(req: Request) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Google OAuth is not configured on this server." },
      { status: 503 },
    );
  }

  const feedToken = new URL(req.url).searchParams.get("feedToken") ?? "";
  const oauth2Client = getOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state: encodeURIComponent(feedToken),
  });

  return NextResponse.redirect(url);
}
