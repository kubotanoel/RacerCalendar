import type { SessionWithRelations } from "@/lib/session-query";

export type SerializedPreviewSession = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  eventName: string;
  seriesName: string;
  venueName: string;
  hasFreeOption: boolean;
};

export function serializePreviewSessions(
  sessions: SessionWithRelations[],
): SerializedPreviewSession[] {
  return sessions.map((s) => ({
    id: s.id,
    title: s.title,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    eventName: s.event.name,
    seriesName: s.event.series.name,
    venueName: s.event.venueName,
    hasFreeOption: s.watchOptions.some((w) => !w.requiresPayment),
  }));
}
