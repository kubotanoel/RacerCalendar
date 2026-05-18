#!/usr/bin/env npx tsx
/**
 * Regenerates data/f1-2026.snapshot.json from the typed table below.
 *
 * Sources:
 * - Official F1 2026 calendar: https://www.formula1.com/en/racing/2026
 * - 2026 FIA F1 World Championship: https://en.wikipedia.org/wiki/2026_Formula_One_World_Championship
 *
 * Notes on the 2026 calendar:
 * - Bahrain (round 3) and Saudi Arabia (round 4) were cancelled. Excluded here.
 * - Round numbers below match the published 22-race schedule.
 * - Azerbaijan races on SATURDAY (Remembrance Day accommodation).
 * - Las Vegas races on SATURDAY night local time (Sunday UTC).
 *
 * Session times use the canonical local race start time per round and are stored
 * here as UTC ISO strings so they survive timezone math at the edges. We intentionally
 * ship only the Race session per event for accuracy; qualifying/sprint can be layered
 * on later from authoritative sources without touching this file.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type { SnapshotBundleInput } from "../src/lib/ingest/snapshot-types";

type Round = {
  round: number;
  slug: string;
  name: string;
  venueName: string;
  /** IANA timezone for the venue. */
  timezone: string;
  /** Inclusive weekend window, local date. */
  weekendStartLocal: string; // YYYY-MM-DD
  weekendEndLocal: string; // YYYY-MM-DD
  /** Race day + start time. Stored as a UTC ISO string. */
  raceStartUtc: string;
  /** Race "soft" cut-off used for endsAt (race start + this many minutes). */
  raceDurationMinutes: number;
  /** Whether the official F1 race name signals a Sprint round (informational only). */
  hasSprint: boolean;
};

const F1_2026: Round[] = [
  {
    round: 1,
    slug: "f1-2026-australia",
    name: "Formula 1 Qatar Airways Australian Grand Prix 2026",
    venueName: "Albert Park Circuit, Melbourne",
    timezone: "Australia/Melbourne",
    weekendStartLocal: "2026-03-06",
    weekendEndLocal: "2026-03-08",
    raceStartUtc: "2026-03-08T04:00:00.000Z", // 15:00 AEDT
    raceDurationMinutes: 150,
    hasSprint: false,
  },
  {
    round: 2,
    slug: "f1-2026-china",
    name: "Formula 1 Heineken Chinese Grand Prix 2026",
    venueName: "Shanghai International Circuit",
    timezone: "Asia/Shanghai",
    weekendStartLocal: "2026-03-13",
    weekendEndLocal: "2026-03-15",
    raceStartUtc: "2026-03-15T07:00:00.000Z", // 15:00 CST
    raceDurationMinutes: 150,
    hasSprint: true,
  },
  {
    round: 3,
    slug: "f1-2026-japan",
    name: "Formula 1 Aramco Japanese Grand Prix 2026",
    venueName: "Suzuka International Racing Course",
    timezone: "Asia/Tokyo",
    weekendStartLocal: "2026-03-27",
    weekendEndLocal: "2026-03-29",
    raceStartUtc: "2026-03-29T05:00:00.000Z", // 14:00 JST
    raceDurationMinutes: 150,
    hasSprint: false,
  },
  {
    round: 4,
    slug: "f1-2026-miami",
    name: "Formula 1 Crypto.com Miami Grand Prix 2026",
    venueName: "Miami International Autodrome",
    timezone: "America/New_York",
    weekendStartLocal: "2026-05-01",
    weekendEndLocal: "2026-05-03",
    raceStartUtc: "2026-05-03T20:00:00.000Z", // 16:00 EDT
    raceDurationMinutes: 150,
    hasSprint: true,
  },
  {
    round: 5,
    slug: "f1-2026-canada",
    name: "Formula 1 Lenovo Grand Prix du Canada 2026",
    venueName: "Circuit Gilles Villeneuve, Montréal",
    timezone: "America/Toronto",
    weekendStartLocal: "2026-05-22",
    weekendEndLocal: "2026-05-24",
    raceStartUtc: "2026-05-24T18:00:00.000Z", // 14:00 EDT
    raceDurationMinutes: 150,
    hasSprint: true,
  },
  {
    round: 6,
    slug: "f1-2026-monaco",
    name: "Formula 1 Louis Vuitton Grand Prix de Monaco 2026",
    venueName: "Circuit de Monaco",
    timezone: "Europe/Monaco",
    weekendStartLocal: "2026-06-05",
    weekendEndLocal: "2026-06-07",
    raceStartUtc: "2026-06-07T13:00:00.000Z", // 15:00 CEST
    raceDurationMinutes: 150,
    hasSprint: false,
  },
  {
    round: 7,
    slug: "f1-2026-barcelona-catalunya",
    name: "Formula 1 MSC Cruises Gran Premio de Barcelona-Catalunya 2026",
    venueName: "Circuit de Barcelona-Catalunya, Montmeló",
    timezone: "Europe/Madrid",
    weekendStartLocal: "2026-06-12",
    weekendEndLocal: "2026-06-14",
    raceStartUtc: "2026-06-14T13:00:00.000Z", // 15:00 CEST
    raceDurationMinutes: 150,
    hasSprint: false,
  },
  {
    round: 8,
    slug: "f1-2026-austria",
    name: "Formula 1 Lenovo Austrian Grand Prix 2026",
    venueName: "Red Bull Ring, Spielberg",
    timezone: "Europe/Vienna",
    weekendStartLocal: "2026-06-26",
    weekendEndLocal: "2026-06-28",
    raceStartUtc: "2026-06-28T13:00:00.000Z", // 15:00 CEST
    raceDurationMinutes: 150,
    hasSprint: false,
  },
  {
    round: 9,
    slug: "f1-2026-great-britain",
    name: "Formula 1 Pirelli British Grand Prix 2026",
    venueName: "Silverstone Circuit",
    timezone: "Europe/London",
    weekendStartLocal: "2026-07-03",
    weekendEndLocal: "2026-07-05",
    raceStartUtc: "2026-07-05T14:00:00.000Z", // 15:00 BST
    raceDurationMinutes: 150,
    hasSprint: true,
  },
  {
    round: 10,
    slug: "f1-2026-belgium",
    name: "Formula 1 Moët & Chandon Belgian Grand Prix 2026",
    venueName: "Circuit de Spa-Francorchamps",
    timezone: "Europe/Brussels",
    weekendStartLocal: "2026-07-17",
    weekendEndLocal: "2026-07-19",
    raceStartUtc: "2026-07-19T13:00:00.000Z", // 15:00 CEST
    raceDurationMinutes: 150,
    hasSprint: false,
  },
  {
    round: 11,
    slug: "f1-2026-hungary",
    name: "Formula 1 AWS Hungarian Grand Prix 2026",
    venueName: "Hungaroring, Mogyoród",
    timezone: "Europe/Budapest",
    weekendStartLocal: "2026-07-24",
    weekendEndLocal: "2026-07-26",
    raceStartUtc: "2026-07-26T13:00:00.000Z", // 15:00 CEST
    raceDurationMinutes: 150,
    hasSprint: false,
  },
  {
    round: 12,
    slug: "f1-2026-netherlands",
    name: "Formula 1 Heineken Dutch Grand Prix 2026",
    venueName: "Circuit Zandvoort",
    timezone: "Europe/Amsterdam",
    weekendStartLocal: "2026-08-21",
    weekendEndLocal: "2026-08-23",
    raceStartUtc: "2026-08-23T13:00:00.000Z", // 15:00 CEST
    raceDurationMinutes: 150,
    hasSprint: true,
  },
  {
    round: 13,
    slug: "f1-2026-italy",
    name: "Formula 1 Pirelli Gran Premio d'Italia 2026",
    venueName: "Autodromo Nazionale Monza",
    timezone: "Europe/Rome",
    weekendStartLocal: "2026-09-04",
    weekendEndLocal: "2026-09-06",
    raceStartUtc: "2026-09-06T13:00:00.000Z", // 15:00 CEST
    raceDurationMinutes: 150,
    hasSprint: false,
  },
  {
    round: 14,
    slug: "f1-2026-spain",
    name: "Formula 1 TAG Heuer Gran Premio de España 2026",
    venueName: "Madring, IFEMA Madrid (street circuit)",
    timezone: "Europe/Madrid",
    weekendStartLocal: "2026-09-11",
    weekendEndLocal: "2026-09-13",
    raceStartUtc: "2026-09-13T13:00:00.000Z", // 15:00 CEST (debut venue; provisional)
    raceDurationMinutes: 150,
    hasSprint: false,
  },
  {
    round: 15,
    slug: "f1-2026-azerbaijan",
    name: "Formula 1 Qatar Airways Azerbaijan Grand Prix 2026",
    venueName: "Baku City Circuit",
    timezone: "Asia/Baku",
    weekendStartLocal: "2026-09-24",
    weekendEndLocal: "2026-09-26",
    // Saturday race per FIA: 13:00 local AZT (UTC+4) on Sat 26 Sep.
    raceStartUtc: "2026-09-26T09:00:00.000Z",
    raceDurationMinutes: 150,
    hasSprint: false,
  },
  {
    round: 16,
    slug: "f1-2026-singapore",
    name: "Formula 1 Singapore Airlines Singapore Grand Prix 2026",
    venueName: "Marina Bay Street Circuit",
    timezone: "Asia/Singapore",
    weekendStartLocal: "2026-10-09",
    weekendEndLocal: "2026-10-11",
    raceStartUtc: "2026-10-11T12:00:00.000Z", // 20:00 SGT (night race)
    raceDurationMinutes: 150,
    hasSprint: true,
  },
  {
    round: 17,
    slug: "f1-2026-united-states",
    name: "Formula 1 MSC Cruises United States Grand Prix 2026",
    venueName: "Circuit of The Americas, Austin",
    timezone: "America/Chicago",
    weekendStartLocal: "2026-10-23",
    weekendEndLocal: "2026-10-25",
    raceStartUtc: "2026-10-25T19:00:00.000Z", // 14:00 CDT
    raceDurationMinutes: 150,
    hasSprint: false,
  },
  {
    round: 18,
    slug: "f1-2026-mexico",
    name: "Formula 1 Gran Premio de la Ciudad de México 2026",
    venueName: "Autódromo Hermanos Rodríguez, Mexico City",
    timezone: "America/Mexico_City",
    weekendStartLocal: "2026-10-30",
    weekendEndLocal: "2026-11-01",
    raceStartUtc: "2026-11-01T20:00:00.000Z", // 14:00 CST (no DST)
    raceDurationMinutes: 150,
    hasSprint: false,
  },
  {
    round: 19,
    slug: "f1-2026-brazil",
    name: "Formula 1 MSC Cruises Grande Prêmio de São Paulo 2026",
    venueName: "Autódromo José Carlos Pace, Interlagos",
    timezone: "America/Sao_Paulo",
    weekendStartLocal: "2026-11-06",
    weekendEndLocal: "2026-11-08",
    raceStartUtc: "2026-11-08T17:00:00.000Z", // 14:00 BRT (no DST)
    raceDurationMinutes: 150,
    hasSprint: false,
  },
  {
    round: 20,
    slug: "f1-2026-las-vegas",
    name: "Formula 1 Heineken Las Vegas Grand Prix 2026",
    venueName: "Las Vegas Strip Circuit",
    timezone: "America/Los_Angeles",
    weekendStartLocal: "2026-11-19",
    weekendEndLocal: "2026-11-21",
    // Saturday-night race local; DST has ended → PST (UTC-8). 20:00 PST → 04:00 UTC Sunday.
    raceStartUtc: "2026-11-22T04:00:00.000Z",
    raceDurationMinutes: 150,
    hasSprint: false,
  },
  {
    round: 21,
    slug: "f1-2026-qatar",
    name: "Formula 1 Qatar Airways Qatar Grand Prix 2026",
    venueName: "Lusail International Circuit",
    timezone: "Asia/Qatar",
    weekendStartLocal: "2026-11-27",
    weekendEndLocal: "2026-11-29",
    raceStartUtc: "2026-11-29T16:00:00.000Z", // 19:00 AST
    raceDurationMinutes: 150,
    hasSprint: false,
  },
  {
    round: 22,
    slug: "f1-2026-abu-dhabi",
    name: "Formula 1 Etihad Airways Abu Dhabi Grand Prix 2026",
    venueName: "Yas Marina Circuit",
    timezone: "Asia/Dubai",
    weekendStartLocal: "2026-12-04",
    weekendEndLocal: "2026-12-06",
    raceStartUtc: "2026-12-06T13:00:00.000Z", // 17:00 GST
    raceDurationMinutes: 150,
    hasSprint: false,
  },
];

/** Local date YYYY-MM-DD → UTC midnight Date (used for event window markers). */
function localDateToUtcMidnightIso(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toISOString();
}

function localDateToUtcEndOfDayIso(date: string): string {
  return new Date(`${date}T23:59:59.000Z`).toISOString();
}

function addMinutesIso(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

function buildBundle(): SnapshotBundleInput {
  return {
    replace: true,
    series: [
      {
        slug: "f1",
        name: "Formula 1 World Championship",
        category: "FORMULA",
        ingestSource: "snapshot_f1_2026",
        dataSourceUrl: "https://www.formula1.com/en/racing/2026",
        licenseNotes:
          "Schedule sourced from formula1.com 2026 calendar and the public Wikipedia 2026 F1 article. Names/trademarks belong to their respective owners; data is editorial reference only.",
        events: F1_2026.map((r) => ({
          slug: r.slug,
          name: r.name,
          venueName: r.venueName,
          timezone: r.timezone,
          startDate: localDateToUtcMidnightIso(r.weekendStartLocal),
          endDate: localDateToUtcEndOfDayIso(r.weekendEndLocal),
          ingestSource: "snapshot_f1_2026",
          dataSourceUrl: "https://www.formula1.com/en/racing/2026",
          sessions: [
            {
              externalKey: `${r.slug}-race`,
              title: r.hasSprint ? "Grand Prix (Sprint weekend)" : "Grand Prix",
              kind: "race",
              startsAt: r.raceStartUtc,
              endsAt: addMinutesIso(r.raceStartUtc, r.raceDurationMinutes),
              dataSourceUrl: "https://www.formula1.com/en/racing/2026",
              watchOptions: [
                {
                  platform: "F1 TV Pro",
                  url: "https://f1tv.formula1.com",
                  requiresPayment: true,
                  notes:
                    "Live world feed of every session. Availability and pricing vary by country; some markets are blacked out where a local broadcaster holds rights.",
                  sourceUrl: "https://www.formula1.com",
                  lastVerifiedAt: new Date().toISOString(),
                  archived: false,
                },
                {
                  platform: "Formula 1 (Official YouTube)",
                  url: "https://www.youtube.com/@Formula1",
                  requiresPayment: false,
                  // Highlights-only — Formula 1 does not stream the race live on YouTube
                  // in any region. The "Only free live streams" filter must skip this row.
                  liveCoverage: false,
                  notes:
                    "Free post-session highlights and clips. Live race coverage is not on YouTube; check your local F1 rights holder for live broadcast.",
                  sourceUrl: "https://www.formula1.com",
                  lastVerifiedAt: new Date().toISOString(),
                  archived: false,
                },
              ],
            },
          ],
        })),
      },
    ],
  };
}

async function main() {
  const bundle = buildBundle();
  const out = resolve(__dirname, "..", "data", "f1-2026.snapshot.json");
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  const eventCount = bundle.series.reduce((n, s) => n + s.events.length, 0);
  console.log(`Wrote ${eventCount} F1 2026 events → ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
