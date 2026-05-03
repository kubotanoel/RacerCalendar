import { google } from "googleapis";

import type { SessionWithRelations } from "@/lib/session-query";
import { sessionToGoogleCalendarEvent } from "@/lib/google/calendar-event-body";
import { loadServiceAccountCredentials } from "@/lib/google/service-credentials";
import { prisma } from "@/lib/prisma";

async function jwtCalendarClient(): Promise<{
  calApi: ReturnType<typeof google.calendar>;
} | null> {
  const creds = loadServiceAccountCredentials();
  if (!creds) return null;

  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  await auth.authorize();

  return { calApi: google.calendar({ version: "v3", auth }) };
}

async function ensureCalendarId(calApi: ReturnType<typeof google.calendar>): Promise<string> {
  const row = await prisma.serviceCalendarState.findUnique({
    where: { id: "default" },
  });
  if (row?.calendarId) return row.calendarId;

  const created = await calApi.calendars.insert({
    requestBody: {
      summary: "RacerCalendar (public)",
      description:
        "Public race schedule synced from RacerCalendar. Subscribe from Google Calendar; hosts refresh it on a timer. Use the site’s ICS/Webcal links if you need filters (free-only, series pickers).",
      timeZone: "UTC",
    },
  });
  const calendarId = created.data.id;
  if (!calendarId) {
    throw new Error("Calendar API returned no calendar id");
  }

  try {
    await calApi.acl.insert({
      calendarId,
      requestBody: {
        role: "reader",
        scope: { type: "default" },
      },
    });
  } catch (e) {
    console.warn(
      "[service-calendar-sync] acl.insert default reader failed — calendar may still be addable only via explicit share",
      e,
    );
  }

  await prisma.serviceCalendarState.create({
    data: { id: "default", calendarId },
  });
  return calendarId;
}

async function deleteFutureInsertedEvents(params: {
  calApi: ReturnType<typeof google.calendar>;
  calendarId: string;
}): Promise<number> {
  const { calApi, calendarId } = params;
  const now = new Date();
  const horizon = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
  let deleted = 0;
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

    for (const ev of list.data.items ?? []) {
      if (!ev.id) continue;
      const mine = ev.extendedProperties?.private?.racercalendar === "1";
      if (!mine) continue;
      await calApi.events.delete({ calendarId, eventId: ev.id });
      deleted += 1;
    }
  } while (pageToken);

  return deleted;
}

/**
 * Writes sessions into the single service-account-backed calendar that end users can subscribe to.
 */
export async function upsertSessionsToServiceCalendar(
  sessions: SessionWithRelations[],
): Promise<{
  calendarId: string;
  inserted: number;
  deletedApprox: number;
}> {
  const client = await jwtCalendarClient();
  if (!client) {
    throw new Error("Google service account env not configured");
  }

  const { calApi } = client;
  const calendarId = await ensureCalendarId(calApi);
  const deletedApprox = await deleteFutureInsertedEvents({ calApi, calendarId });

  let inserted = 0;
  for (const s of sessions) {
    await calApi.events.insert({
      calendarId,
      requestBody: sessionToGoogleCalendarEvent(s),
    });
    inserted += 1;
  }

  return { calendarId, inserted, deletedApprox };
}
