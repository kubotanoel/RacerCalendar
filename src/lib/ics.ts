import ical, { ICalCalendarMethod } from "ical-generator";

import type { SessionWithRelations } from "@/lib/session-query";

const DISCLAIMER =
  "Broadcast rights change by region — verify streams locally. Links are informational.";

export function serializeIcsCalendar(sessions: SessionWithRelations[]): string {
  const calendar = ical({
    name: "RacerCalendar",
    timezone: "UTC",
  });
  calendar.method(ICalCalendarMethod.PUBLISH);

  for (const s of sessions) {
    const series = s.event.series;
    const freeOpts = s.watchOptions.filter((w) => !w.requiresPayment);
    const lines = watchLines(freeOpts.length ? freeOpts : s.watchOptions);

    calendar.createEvent({
      id: `${s.id}@racercalendar`,
      start: s.startsAt,
      end: s.endsAt,
      summary: `[${series.name}] ${s.event.name} — ${s.title}`,
      description: `${DISCLAIMER}\n\nVenue: ${s.event.venueName}\n\n${lines}`,
      location: s.event.venueName,
      url: pickPrimaryUrl(s),
    });
  }

  return calendar.toString();
}

function pickPrimaryUrl(s: SessionWithRelations): string | undefined {
  const pick = [...s.watchOptions].sort(
    (a, b) => Number(a.requiresPayment) - Number(b.requiresPayment),
  );
  return pick.find((w) => w.url)?.url;
}

function watchLines(opts: SessionWithRelations["watchOptions"]): string {
  if (!opts.length) return "(No watch links on file)";
  return opts
    .map((w) => {
      const cost = w.requiresPayment ? "(subscription may apply)" : "Free";
      return `${cost} — ${w.platform}: ${w.url}${w.notes ? ` — ${w.notes}` : ""}`;
    })
    .join("\n");
}
