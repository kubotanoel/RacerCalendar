import { google } from "googleapis";

import type { SessionWithRelations } from "@/lib/session-query";
import { getOAuthClient } from "@/lib/google/oauth";
import { prisma } from "@/lib/prisma";

const DISCLAIMER =
  "Broadcast rights change by region — verify streams locally. Links are informational.";

function pickPrimaryUrl(s: SessionWithRelations): string | undefined {
  const pick = [...s.watchOptions].sort(
    (a, b) => Number(a.requiresPayment) - Number(b.requiresPayment),
  );
  return pick.find((w) => w.url)?.url;
}

function watchDescription(s: SessionWithRelations): string {
  const freeOpts = s.watchOptions.filter((w) => !w.requiresPayment);
  const opts = freeOpts.length ? freeOpts : s.watchOptions;
  const lines =
    opts.length === 0
      ? "(No watch links on file)"
      : opts
          .map((w) => {
            const cost = w.requiresPayment ? "(subscription may apply)" : "Free";
            return `${cost} — ${w.platform}: ${w.url}${w.notes ? ` — ${w.notes}` : ""}`;
          })
          .join("\n");
  return `${DISCLAIMER}\n\nVenue: ${s.event.venueName}\n\n${lines}`;
}

function sessionSummary(s: SessionWithRelations): string {
  return `[${s.event.series.name}] ${s.event.name} — ${s.title}`;
}

/**
 * Ensures a dedicated calendar exists, wipes future-ish events inside it,
 * inserts current sessions.
 */
export async function upsertSessionsToCalendar(
  accountId: string,
  sessions: SessionWithRelations[],
): Promise<{ calendarId: string; inserted: number; deletedApprox: number }> {
  const account = await prisma.googleAccount.findUniqueOrThrow({
    where: { id: accountId },
  });

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({
    refresh_token: account.refreshToken,
  });

  let calendarId = account.calendarId;
  const calApi = google.calendar({ version: "v3", auth: oauth2Client });

  if (!calendarId) {
    const created = await calApi.calendars.insert({
      requestBody: {
        summary: "RacerCalendar",
        description:
          "Auto-managed by racercalendar. You can rename or unsubscribe — re-sync creates a fresh feed.",
        timeZone: "UTC",
      },
    });
    calendarId = created.data.id!;
    await prisma.googleAccount.update({
      where: { id: accountId },
      data: { calendarId },
    });
  }

  const now = new Date();
  const horizon = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  let deletedApprox = 0;
  let pageToken: string | undefined;

  do {
    const list = await calApi.events.list({
      calendarId,
      timeMin: now.toISOString(),
      timeMax: horizon.toISOString(),
      singleEvents: true,
      maxResults: 250,
      pageToken,
    });
    pageToken = list.data.nextPageToken ?? undefined;

    const items = list.data.items ?? [];
    for (const ev of items) {
      if (!ev.id) continue;
      await calApi.events.delete({ calendarId, eventId: ev.id });
      deletedApprox += 1;
    }
  } while (pageToken);

  let inserted = 0;
  for (const s of sessions) {
    await calApi.events.insert({
      calendarId,
      requestBody: {
        summary: sessionSummary(s),
        description: watchDescription(s),
        location: s.event.venueName,
        start: { dateTime: s.startsAt.toISOString(), timeZone: "UTC" },
        end: { dateTime: s.endsAt.toISOString(), timeZone: "UTC" },
        source: pickPrimaryUrl(s)
          ? { title: `${s.title} watch`, url: pickPrimaryUrl(s)! }
          : undefined,
        extendedProperties: {
          private: { racercalendar: "1", sessionId: s.id },
        },
      },
    });
    inserted += 1;
  }

  return { calendarId, inserted, deletedApprox };
}
