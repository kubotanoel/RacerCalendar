/** Google Calendar UI “subscribe / add calendar” shortcut for secondary calendar IDs. */
export function googleCalendarAddHref(calendarId: string): string {
  const encoded = Buffer.from(calendarId, "utf8").toString("base64").replace(/=+$/, "");
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(encoded)}`;
}
