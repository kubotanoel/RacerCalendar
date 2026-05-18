import ical, { ICalAlarmType, ICalCalendarMethod } from "ical-generator";

import type { SessionWithRelations } from "@/lib/session-query";

const DISCLAIMER =
  "Broadcast rights change by region — verify streams locally. Links are informational.";

/** Default lead-time for the per-event reminder (30 minutes before lights-out). */
const DEFAULT_REMINDER_SECONDS = 30 * 60;

export function serializeIcsCalendar(sessions: SessionWithRelations[]): string {
  const calendar = ical({
    name: "RacerCalendar",
    description:
      "Curated motorsport calendar from racercalendar — race weekends with watch links. " +
      "Times shown in each venue's local timezone. Re-subscribe via the app to change filters.",
    // Fallback calendar-level timezone; per-event TZID below overrides this for display.
    timezone: "UTC",
  });
  calendar.method(ICalCalendarMethod.PUBLISH);

  for (const s of sessions) {
    const series = s.event.series;
    const freeOpts = s.watchOptions.filter((w) => !w.requiresPayment);
    const lines = watchLines(freeOpts.length ? freeOpts : s.watchOptions);
    const venueTz = s.event.timezone || "UTC";

    calendar.createEvent({
      id: `${s.id}@racercalendar`,
      start: s.startsAt,
      end: s.endsAt,
      // Tell calendar clients to render this event in the venue's local time,
      // even though startsAt/endsAt are UTC instants — ical-generator emits the
      // appropriate VTIMEZONE block and a TZID-qualified DTSTART/DTEND.
      timezone: venueTz,
      summary: `[${series.name}] ${s.event.name} — ${s.title}`,
      description: `${DISCLAIMER}\n\nVenue: ${s.event.venueName}\n\n${lines}`,
      location: s.event.venueName,
      url: pickPrimaryUrl(s),
      alarms: [
        {
          type: ICalAlarmType.display,
          triggerBefore: DEFAULT_REMINDER_SECONDS,
          description: `${s.title} — ${s.event.name}`,
        },
      ],
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
