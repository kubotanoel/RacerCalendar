import type { calendar_v3 } from "googleapis";

import type { SessionWithRelations } from "@/lib/session-query";

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
 * Payload for inserting a racing session into any Google Calendar the caller can write.
 */
export function sessionToGoogleCalendarEvent(
  s: SessionWithRelations,
): calendar_v3.Schema$Event {
  const primary = pickPrimaryUrl(s);
  return {
    summary: sessionSummary(s),
    description: watchDescription(s),
    location: s.event.venueName,
    start: { dateTime: s.startsAt.toISOString(), timeZone: "UTC" },
    end: { dateTime: s.endsAt.toISOString(), timeZone: "UTC" },
    source: primary ?
      { title: `${s.title} watch`, url: primary }
    : undefined,
    extendedProperties: {
      private: { racercalendar: "1", sessionId: s.id },
    },
  };
}
