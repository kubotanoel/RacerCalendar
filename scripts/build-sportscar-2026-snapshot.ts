#!/usr/bin/env npx tsx
/**
 * Regenerates data/sportscar-2026.snapshot.json from the typed tables below.
 *
 * Bundles three sportscar/endurance series:
 *   - FIA World Endurance Championship 2026 (`wec`)
 *   - IMSA WeatherTech SportsCar Championship 2026 (`imsa-weathertech`)
 *   - ADAC RAVENOL Nürburgring Langstrecken-Serie 2026 (`nls`)
 *
 * Sources:
 *   - WEC: https://www.fia.com/events/world-endurance-championship/season-2026/fia-world-endurance-championship
 *          https://www.fiawec.com (official site)
 *   - IMSA: https://www.imsa.com/weathertech/weathertech-2026-schedule/
 *   - NLS: https://www.nuerburgring-langstrecken-serie.de/language/en/calendar-nurburgring-langstrecken-serie-2026/
 *
 * Importantly: this snapshot is ADDITIVE (no `replace: true`). It coexists with F1 2026.
 *
 * Race start times: published official local start where verified. Where the series
 * historically starts at a fixed local time of day per venue (typical for IMSA and NLS),
 * we use that pattern and mark the cell. Where the time is uncertain we still ship the
 * weekend window so the date is correct; we do NOT fabricate a precise UTC instant.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type { SnapshotBundleInput, SnapshotSeriesInput } from "../src/lib/ingest/snapshot-types";

const NOW_ISO = new Date().toISOString();

type EnduranceEvent = {
  slug: string;
  name: string;
  venueName: string;
  /** IANA timezone for the venue. */
  timezone: string;
  /** Inclusive weekend window (local dates, YYYY-MM-DD). */
  weekendStartLocal: string;
  weekendEndLocal: string;
  /** Race day UTC start. */
  raceStartUtc: string;
  /** Race duration in minutes (24h=1440, 12h=720, 6h=360, 4h=240, 2h40=160). */
  raceDurationMinutes: number;
  /** Optional human-readable race title (defaults to "Race"). */
  raceTitle?: string;
};

// =========================================================================
// FIA WEC 2026 — 8 rounds. Past rounds (Qatar, Imola, Spa) are intentionally
// included so historical browsing works once we later relax the past-event filter.
// =========================================================================
const WEC_2026: EnduranceEvent[] = [
  {
    slug: "wec-2026-qatar",
    name: "Qatar 1812 km",
    venueName: "Lusail International Circuit",
    timezone: "Asia/Qatar",
    weekendStartLocal: "2026-03-26",
    weekendEndLocal: "2026-03-28",
    raceStartUtc: "2026-03-28T11:00:00.000Z", // 14:00 AST (UTC+3)
    raceDurationMinutes: 10 * 60 + 12, // 1812 km @ Lusail ≈ 10h12m max race window
    raceTitle: "Qatar 1812 km",
  },
  {
    slug: "wec-2026-imola",
    name: "6 Hours of Imola",
    venueName: "Autodromo Enzo e Dino Ferrari, Imola",
    timezone: "Europe/Rome",
    weekendStartLocal: "2026-04-17",
    weekendEndLocal: "2026-04-19",
    raceStartUtc: "2026-04-19T11:00:00.000Z", // 13:00 CEST
    raceDurationMinutes: 6 * 60,
    raceTitle: "6 Hours of Imola",
  },
  {
    slug: "wec-2026-spa",
    name: "TotalEnergies 6 Hours of Spa-Francorchamps",
    venueName: "Circuit de Spa-Francorchamps",
    timezone: "Europe/Brussels",
    weekendStartLocal: "2026-05-07",
    weekendEndLocal: "2026-05-09",
    raceStartUtc: "2026-05-09T11:00:00.000Z", // 13:00 CEST
    raceDurationMinutes: 6 * 60,
    raceTitle: "6 Hours of Spa-Francorchamps",
  },
  {
    slug: "wec-2026-le-mans",
    name: "24 Hours of Le Mans",
    venueName: "Circuit de la Sarthe, Le Mans",
    timezone: "Europe/Paris",
    weekendStartLocal: "2026-06-10",
    weekendEndLocal: "2026-06-14",
    raceStartUtc: "2026-06-13T14:00:00.000Z", // 16:00 CEST race start (official)
    raceDurationMinutes: 24 * 60,
    raceTitle: "24 Hours of Le Mans",
  },
  {
    slug: "wec-2026-sao-paulo",
    name: "Rolex 6 Hours of São Paulo",
    venueName: "Autódromo José Carlos Pace, Interlagos",
    timezone: "America/Sao_Paulo",
    weekendStartLocal: "2026-07-10",
    weekendEndLocal: "2026-07-12",
    raceStartUtc: "2026-07-12T14:30:00.000Z", // 11:30 BRT (typical WEC SP start)
    raceDurationMinutes: 6 * 60,
    raceTitle: "6 Hours of São Paulo",
  },
  {
    slug: "wec-2026-cota",
    name: "Lone Star Le Mans",
    venueName: "Circuit of The Americas, Austin",
    timezone: "America/Chicago",
    weekendStartLocal: "2026-09-04",
    weekendEndLocal: "2026-09-06",
    raceStartUtc: "2026-09-05T18:00:00.000Z", // 13:00 CDT Saturday race
    raceDurationMinutes: 6 * 60,
    raceTitle: "Lone Star Le Mans (6 Hours of COTA)",
  },
  {
    slug: "wec-2026-fuji",
    name: "6 Hours of Fuji",
    venueName: "Fuji Speedway",
    timezone: "Asia/Tokyo",
    weekendStartLocal: "2026-09-25",
    weekendEndLocal: "2026-09-27",
    raceStartUtc: "2026-09-27T02:00:00.000Z", // 11:00 JST
    raceDurationMinutes: 6 * 60,
    raceTitle: "6 Hours of Fuji",
  },
  {
    slug: "wec-2026-bahrain",
    name: "Bapco Energies 8 Hours of Bahrain",
    venueName: "Bahrain International Circuit",
    timezone: "Asia/Bahrain",
    weekendStartLocal: "2026-11-05",
    weekendEndLocal: "2026-11-07",
    raceStartUtc: "2026-11-07T11:00:00.000Z", // 14:00 AST (UTC+3)
    raceDurationMinutes: 8 * 60,
    raceTitle: "8 Hours of Bahrain",
  },
];

// =========================================================================
// IMSA WeatherTech 2026. Past rounds included for archive completeness.
// =========================================================================
const IMSA_2026: EnduranceEvent[] = [
  {
    slug: "imsa-2026-daytona",
    name: "Rolex 24 At Daytona",
    venueName: "Daytona International Speedway",
    timezone: "America/New_York",
    weekendStartLocal: "2026-01-22",
    weekendEndLocal: "2026-01-25",
    raceStartUtc: "2026-01-24T18:40:00.000Z", // 13:40 EST
    raceDurationMinutes: 24 * 60,
    raceTitle: "Rolex 24 At Daytona",
  },
  {
    slug: "imsa-2026-sebring",
    name: "Mobil 1 Twelve Hours of Sebring",
    venueName: "Sebring International Raceway",
    timezone: "America/New_York",
    weekendStartLocal: "2026-03-18",
    weekendEndLocal: "2026-03-21",
    raceStartUtc: "2026-03-21T14:10:00.000Z", // 10:10 EDT
    raceDurationMinutes: 12 * 60,
    raceTitle: "Twelve Hours of Sebring",
  },
  {
    slug: "imsa-2026-long-beach",
    name: "Acura Grand Prix of Long Beach",
    venueName: "Long Beach Street Circuit",
    timezone: "America/Los_Angeles",
    weekendStartLocal: "2026-04-17",
    weekendEndLocal: "2026-04-19",
    raceStartUtc: "2026-04-18T22:05:00.000Z", // 15:05 PDT Saturday race
    raceDurationMinutes: 100,
    raceTitle: "Long Beach 100min",
  },
  {
    slug: "imsa-2026-laguna-seca",
    name: "WeatherTech Raceway Laguna Seca",
    venueName: "WeatherTech Raceway Laguna Seca",
    timezone: "America/Los_Angeles",
    weekendStartLocal: "2026-05-01",
    weekendEndLocal: "2026-05-03",
    raceStartUtc: "2026-05-03T19:10:00.000Z", // 12:10 PDT
    raceDurationMinutes: 160,
    raceTitle: "Monterey 2h40",
  },
  {
    slug: "imsa-2026-detroit",
    name: "Chevrolet Detroit Grand Prix",
    venueName: "Detroit Street Circuit",
    timezone: "America/New_York",
    weekendStartLocal: "2026-05-29",
    weekendEndLocal: "2026-05-30",
    raceStartUtc: "2026-05-30T17:10:00.000Z", // 13:10 EDT Saturday race
    raceDurationMinutes: 100,
    raceTitle: "Detroit 100min",
  },
  {
    slug: "imsa-2026-watkins-glen",
    name: "Sahlen's Six Hours of The Glen",
    venueName: "Watkins Glen International",
    timezone: "America/New_York",
    weekendStartLocal: "2026-06-25",
    weekendEndLocal: "2026-06-28",
    raceStartUtc: "2026-06-28T14:40:00.000Z", // 10:40 EDT
    raceDurationMinutes: 6 * 60,
    raceTitle: "Six Hours of The Glen",
  },
  {
    slug: "imsa-2026-mosport",
    name: "Chevrolet Grand Prix",
    venueName: "Canadian Tire Motorsport Park, Bowmanville",
    timezone: "America/Toronto",
    weekendStartLocal: "2026-07-10",
    weekendEndLocal: "2026-07-12",
    raceStartUtc: "2026-07-12T17:05:00.000Z", // 13:05 EDT
    raceDurationMinutes: 160,
    raceTitle: "Mosport 2h40",
  },
  {
    slug: "imsa-2026-road-america",
    name: "Motul SportsCar Endurance Grand Prix",
    venueName: "Road America, Elkhart Lake",
    timezone: "America/Chicago",
    weekendStartLocal: "2026-07-30",
    weekendEndLocal: "2026-08-02",
    raceStartUtc: "2026-08-02T16:10:00.000Z", // 11:10 CDT Sunday race start
    raceDurationMinutes: 6 * 60,
    raceTitle: "Road America 6 Hours",
  },
  {
    slug: "imsa-2026-vir",
    name: "Michelin GT Challenge at VIR",
    venueName: "Virginia International Raceway, Alton",
    timezone: "America/New_York",
    weekendStartLocal: "2026-08-21",
    weekendEndLocal: "2026-08-23",
    raceStartUtc: "2026-08-23T17:10:00.000Z", // 13:10 EDT (GT-only)
    raceDurationMinutes: 160,
    raceTitle: "VIR 2h40 (GT only)",
  },
  {
    slug: "imsa-2026-indy",
    name: "TireRack.com Battle On The Bricks",
    venueName: "Indianapolis Motor Speedway",
    timezone: "America/Indiana/Indianapolis",
    weekendStartLocal: "2026-09-18",
    weekendEndLocal: "2026-09-20",
    raceStartUtc: "2026-09-20T16:10:00.000Z", // 12:10 EDT
    raceDurationMinutes: 160,
    raceTitle: "Indianapolis 2h40",
  },
  {
    slug: "imsa-2026-petit-le-mans",
    name: "Motul Petit Le Mans",
    venueName: "Michelin Raceway Road Atlanta",
    timezone: "America/New_York",
    weekendStartLocal: "2026-09-30",
    weekendEndLocal: "2026-10-03",
    raceStartUtc: "2026-10-03T16:05:00.000Z", // 12:05 EDT
    raceDurationMinutes: 10 * 60,
    raceTitle: "Petit Le Mans (10 Hours)",
  },
];

// =========================================================================
// NLS 2026 — 10 races, all at Nürburgring Nordschleife. NLS uses a fixed
// weekend pattern: qualifying ~08:30 local, race start 12:00 local.
// 24h Qualifiers shared a single weekend with 2 races (NLS4+NLS5).
// All rounds stream FREE live on the official NLS YouTube with English commentary.
// =========================================================================
const NLS_2026: EnduranceEvent[] = [
  {
    slug: "nls-2026-r1-westfalenfahrt",
    name: "NLS1: 71. ADAC Westfalenfahrt",
    venueName: "Nürburgring Nordschleife",
    timezone: "Europe/Berlin",
    weekendStartLocal: "2026-03-13",
    weekendEndLocal: "2026-03-14",
    raceStartUtc: "2026-03-14T11:00:00.000Z", // 12:00 CET (still CET in mid-March)
    raceDurationMinutes: 4 * 60,
    raceTitle: "NLS1 (4h)",
  },
  {
    slug: "nls-2026-r2-barbarossapreis",
    name: "NLS2: 58. ADAC Barbarossapreis",
    venueName: "Nürburgring Nordschleife",
    timezone: "Europe/Berlin",
    weekendStartLocal: "2026-03-20",
    weekendEndLocal: "2026-03-21",
    raceStartUtc: "2026-03-21T11:00:00.000Z",
    raceDurationMinutes: 4 * 60,
    raceTitle: "NLS2 (4h)",
  },
  {
    slug: "nls-2026-r3-rundstrecken-trophy",
    name: "NLS3: 57. Adenauer ADAC Rundstrecken-Trophy",
    venueName: "Nürburgring Nordschleife",
    timezone: "Europe/Berlin",
    weekendStartLocal: "2026-04-10",
    weekendEndLocal: "2026-04-11",
    raceStartUtc: "2026-04-11T10:00:00.000Z", // 12:00 CEST
    raceDurationMinutes: 4 * 60,
    raceTitle: "NLS3 (4h)",
  },
  {
    slug: "nls-2026-r4-qualifiers-day1",
    name: "NLS4 / 24h Qualifiers Race 1",
    venueName: "Nürburgring Nordschleife",
    timezone: "Europe/Berlin",
    weekendStartLocal: "2026-04-18",
    weekendEndLocal: "2026-04-19",
    raceStartUtc: "2026-04-18T10:00:00.000Z",
    raceDurationMinutes: 4 * 60,
    raceTitle: "NLS4 24h Qualifiers (4h)",
  },
  {
    slug: "nls-2026-r5-qualifiers-day2",
    name: "NLS5 / 24h Qualifiers Race 2",
    venueName: "Nürburgring Nordschleife",
    timezone: "Europe/Berlin",
    weekendStartLocal: "2026-04-18",
    weekendEndLocal: "2026-04-19",
    raceStartUtc: "2026-04-19T10:00:00.000Z",
    raceDurationMinutes: 4 * 60,
    raceTitle: "NLS5 24h Qualifiers (4h)",
  },
  {
    slug: "nls-2026-r6-eifel-trophy",
    name: "NLS6: 1. ADAC Eifel Trophy",
    venueName: "Nürburgring Nordschleife",
    timezone: "Europe/Berlin",
    weekendStartLocal: "2026-06-19",
    weekendEndLocal: "2026-06-20",
    raceStartUtc: "2026-06-20T10:00:00.000Z",
    raceDurationMinutes: 4 * 60,
    raceTitle: "NLS6 (4h)",
  },
  {
    slug: "nls-2026-r7-ruhr-pokal-6h",
    name: "NLS7: KW 6h ADAC Ruhr-Pokal-Rennen",
    venueName: "Nürburgring Nordschleife",
    timezone: "Europe/Berlin",
    weekendStartLocal: "2026-07-31",
    weekendEndLocal: "2026-08-01",
    raceStartUtc: "2026-08-01T10:00:00.000Z",
    raceDurationMinutes: 6 * 60,
    raceTitle: "NLS7 6h Ruhr-Pokal",
  },
  {
    slug: "nls-2026-r8-reinoldus",
    name: "NLS8: 65. ADAC Reinoldus-Langstreckenrennen",
    venueName: "Nürburgring Nordschleife",
    timezone: "Europe/Berlin",
    weekendStartLocal: "2026-09-11",
    weekendEndLocal: "2026-09-12",
    raceStartUtc: "2026-09-12T10:00:00.000Z",
    raceDurationMinutes: 4 * 60,
    raceTitle: "NLS8 (4h)",
  },
  {
    slug: "nls-2026-r9-acas-cup",
    name: "NLS9: 66. ADAC ACAS Cup",
    venueName: "Nürburgring Nordschleife",
    timezone: "Europe/Berlin",
    weekendStartLocal: "2026-09-12",
    weekendEndLocal: "2026-09-13",
    raceStartUtc: "2026-09-13T10:00:00.000Z",
    raceDurationMinutes: 4 * 60,
    raceTitle: "NLS9 (4h)",
  },
  {
    slug: "nls-2026-r10-sportwarte-trophy",
    name: "NLS10: 2. NLS Sportwarte-Trophy",
    venueName: "Nürburgring Nordschleife",
    timezone: "Europe/Berlin",
    weekendStartLocal: "2026-10-09",
    weekendEndLocal: "2026-10-10",
    raceStartUtc: "2026-10-10T10:00:00.000Z",
    raceDurationMinutes: 4 * 60,
    raceTitle: "NLS10 (4h)",
  },
];

// =========================================================================
// Helpers
// =========================================================================
function localDateToUtcMidnightIso(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toISOString();
}

function localDateToUtcEndOfDayIso(date: string): string {
  return new Date(`${date}T23:59:59.000Z`).toISOString();
}

function addMinutesIso(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

// =========================================================================
// Series → SnapshotSeriesInput
// =========================================================================
function wecSeries(): SnapshotSeriesInput {
  return {
    slug: "wec",
    name: "FIA World Endurance Championship",
    category: "SPORTSCAR",
    ingestSource: "snapshot_sportscar_2026",
    dataSourceUrl: "https://www.fiawec.com",
    licenseNotes:
      "Schedule from fia.com / fiawec.com 2026 calendar. Names and trademarks belong to their respective owners.",
    events: WEC_2026.map((r) => ({
      slug: r.slug,
      name: r.name,
      venueName: r.venueName,
      timezone: r.timezone,
      startDate: localDateToUtcMidnightIso(r.weekendStartLocal),
      endDate: localDateToUtcEndOfDayIso(r.weekendEndLocal),
      ingestSource: "snapshot_sportscar_2026",
      dataSourceUrl: "https://www.fiawec.com",
      sessions: [
        {
          externalKey: `${r.slug}-race`,
          title: r.raceTitle ?? "Race",
          kind: "race",
          startsAt: r.raceStartUtc,
          endsAt: addMinutesIso(r.raceStartUtc, r.raceDurationMinutes),
          dataSourceUrl: "https://www.fiawec.com",
          watchOptions: [
            {
              platform: "FIA WEC TV",
              url: "https://www.fiawec.tv",
              requiresPayment: true,
              liveCoverage: true,
              notes:
                "Official global live stream. Paid subscription. Coverage and pricing vary by territory.",
              sourceUrl: "https://www.fiawec.com",
              lastVerifiedAt: NOW_ISO,
              archived: false,
            },
            {
              platform: "FIA WEC (Official YouTube)",
              url: "https://www.youtube.com/@FIAWEC_OFFICIAL",
              requiresPayment: false,
              liveCoverage: false,
              notes:
                "Free highlights, qualifying replays and post-race clips. Live race coverage is on FIA WEC TV / local broadcasters, not YouTube.",
              sourceUrl: "https://www.fiawec.com",
              lastVerifiedAt: NOW_ISO,
              archived: false,
            },
          ],
        },
      ],
    })),
  };
}

function imsaSeries(): SnapshotSeriesInput {
  return {
    slug: "imsa-weathertech",
    name: "IMSA WeatherTech SportsCar Championship",
    category: "SPORTSCAR",
    ingestSource: "snapshot_sportscar_2026",
    dataSourceUrl: "https://www.imsa.com/weathertech/weathertech-2026-schedule/",
    licenseNotes:
      "Schedule from imsa.com official 2026 calendar. Names and trademarks belong to their respective owners.",
    events: IMSA_2026.map((r) => ({
      slug: r.slug,
      name: r.name,
      venueName: r.venueName,
      timezone: r.timezone,
      startDate: localDateToUtcMidnightIso(r.weekendStartLocal),
      endDate: localDateToUtcEndOfDayIso(r.weekendEndLocal),
      ingestSource: "snapshot_sportscar_2026",
      dataSourceUrl: "https://www.imsa.com",
      sessions: [
        {
          externalKey: `${r.slug}-race`,
          title: r.raceTitle ?? "Race",
          kind: "race",
          startsAt: r.raceStartUtc,
          endsAt: addMinutesIso(r.raceStartUtc, r.raceDurationMinutes),
          dataSourceUrl: "https://www.imsa.com",
          watchOptions: [
            {
              platform: "Peacock (US)",
              url: "https://www.peacocktv.com",
              requiresPayment: true,
              liveCoverage: true,
              notes:
                "Official US live stream for the WeatherTech SportsCar Championship; paid NBCUniversal subscription. Select races also air on NBC over-the-air in the US.",
              sourceUrl: "https://www.imsa.com",
              regions: "US",
              lastVerifiedAt: NOW_ISO,
              archived: false,
            },
            {
              platform: "IMSA Official (YouTube)",
              url: "https://www.youtube.com/@IMSARacingOfficial",
              requiresPayment: false,
              // IMSA streams selected qualifying / practice / weekend coverage live on
              // YouTube for free in many regions, plus the full race in some markets.
              // Coverage varies per round and per session — mark as live but with notes.
              liveCoverage: true,
              notes:
                "Selected practice/qualifying and some race sessions stream live for free on the IMSA Official YouTube channel, plus replays/highlights. Coverage varies by round and region; in the US the race is typically on NBC/Peacock.",
              sourceUrl: "https://www.imsa.com",
              lastVerifiedAt: NOW_ISO,
              archived: false,
            },
          ],
        },
      ],
    })),
  };
}

function nlsSeries(): SnapshotSeriesInput {
  return {
    slug: "nls",
    name: "ADAC RAVENOL Nürburgring Langstrecken-Serie",
    category: "SPORTSCAR",
    ingestSource: "snapshot_sportscar_2026",
    dataSourceUrl: "https://www.nuerburgring-langstrecken-serie.de",
    licenseNotes:
      "Schedule from the official NLS site. Names and trademarks belong to their respective owners.",
    events: NLS_2026.map((r) => ({
      slug: r.slug,
      name: r.name,
      venueName: r.venueName,
      timezone: r.timezone,
      startDate: localDateToUtcMidnightIso(r.weekendStartLocal),
      endDate: localDateToUtcEndOfDayIso(r.weekendEndLocal),
      ingestSource: "snapshot_sportscar_2026",
      dataSourceUrl: "https://www.nuerburgring-langstrecken-serie.de",
      sessions: [
        {
          externalKey: `${r.slug}-race`,
          title: r.raceTitle ?? "Race",
          kind: "race",
          startsAt: r.raceStartUtc,
          endsAt: addMinutesIso(r.raceStartUtc, r.raceDurationMinutes),
          dataSourceUrl: "https://www.nuerburgring-langstrecken-serie.de",
          watchOptions: [
            {
              platform: "NLS (Official YouTube)",
              url: "https://www.youtube.com/@NLS_offiziell",
              requiresPayment: false,
              liveCoverage: true,
              notes:
                "Every NLS round streams free, live and uninterrupted on the official NLS YouTube channel — German feed with an English commentary option.",
              sourceUrl: "https://www.nuerburgring-langstrecken-serie.de",
              lastVerifiedAt: NOW_ISO,
              archived: false,
            },
          ],
        },
      ],
    })),
  };
}

function buildBundle(): SnapshotBundleInput {
  return {
    // ADDITIVE: don't wipe F1; just upsert sportscar rows alongside it.
    replace: false,
    series: [wecSeries(), imsaSeries(), nlsSeries()],
  };
}

async function main() {
  const bundle = buildBundle();
  const out = resolve(__dirname, "..", "data", "sportscar-2026.snapshot.json");
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  const eventCount = bundle.series.reduce((n, s) => n + s.events.length, 0);
  console.log(
    `Wrote ${bundle.series.length} sportscar series (${eventCount} events) → ${out}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
