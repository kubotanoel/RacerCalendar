import { Category } from "@prisma/client";

import { prisma } from "../src/lib/prisma";

/** Demo sessions anchored to “today” UTC so ICS feeds stay populated after redeploy/seeding. */
function utcSession(
  daysFromToday: number,
  hourUTC: number,
  minuteUTC: number,
  durationMinutes: number,
) {
  const startsAt = new Date();
  startsAt.setUTCHours(0, 0, 0, 0);
  startsAt.setUTCDate(startsAt.getUTCDate() + daysFromToday);
  startsAt.setUTCHours(hourUTC, minuteUTC, 0, 0);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  return { startsAt, endsAt };
}

async function main() {
  await prisma.googleAccount.deleteMany();
  await prisma.series.deleteMany();

  const imsEventStart = new Date();
  imsEventStart.setUTCHours(0, 0, 0, 0);
  imsEventStart.setUTCDate(imsEventStart.getUTCDate() + 18);

  const f1EventStart = new Date();
  f1EventStart.setUTCHours(0, 0, 0, 0);
  f1EventStart.setUTCDate(f1EventStart.getUTCDate() + 11);

  const imsQual = utcSession(20, 19, 5, 55);
  const imsRace = utcSession(21, 17, 40, 360);
  const f1Fp = utcSession(12, 11, 35, 55);
  const f1Race = utcSession(13, 13, 40, 240);

  const imsEnd = new Date(imsRace.endsAt.getTime() + 24 * 60 * 60_000);
  const f1End = new Date(f1Race.endsAt.getTime() + 24 * 60 * 60_000);

  const y = imsEventStart.getUTCFullYear();

  await prisma.series.create({
    data: {
      name: "IMSA WeatherTech SportsCar Championship",
      slug: "imsa-weathertech",
      category: Category.SPORTSCAR,
      events: {
        create: {
          name: "Sahlens Six Hours of The Glen",
          slug: `demo-watkins-glen-${y}`,
          venueName: "Watkins Glen International",
          timezone: "America/New_York",
          startDate: imsEventStart,
          endDate: imsEnd,
          sessions: {
            create: [
              {
                title: "Qualifying",
                kind: "qualifying",
                startsAt: imsQual.startsAt,
                endsAt: imsQual.endsAt,
                watchOptions: {
                  create: [
                    {
                      platform: "YouTube (IMSA Official)",
                      url: "https://www.youtube.com/@IMSARacingOfficial",
                      requiresPayment: false,
                      notes:
                        "Often includes live qualifying and select sessions in the United States.",
                      sourceUrl: "https://www.imsa.com",
                      lastVerifiedAt: new Date(),
                    },
                  ],
                },
              },
              {
                title: "Six Hours race",
                kind: "race",
                startsAt: imsRace.startsAt,
                endsAt: imsRace.endsAt,
                watchOptions: {
                  create: [
                    {
                      platform: "YouTube (IMSA Official)",
                      url: "https://www.youtube.com/@IMSARacingOfficial",
                      requiresPayment: false,
                      notes:
                        "Full WeatherTech endurance races routinely stream live on IMSA Official YouTube in the United States.",
                      sourceUrl: "https://www.imsa.com",
                      lastVerifiedAt: new Date(),
                    },
                    {
                      platform: "Peacock (US)",
                      url: "https://www.peacocktv.com",
                      requiresPayment: true,
                      notes:
                        "Some sessions may also carry a paid NBCUniversal stream.",
                      lastVerifiedAt: new Date(),
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    },
  });

  await prisma.series.create({
    data: {
      name: "Formula 1 World Championship",
      slug: "f1",
      category: Category.FORMULA,
      events: {
        create: {
          name: "Monaco Grand Prix",
          slug: `demo-monaco-${y}`,
          venueName: "Circuit de Monaco",
          timezone: "Europe/Monaco",
          startDate: f1EventStart,
          endDate: f1End,
          sessions: {
            create: [
              {
                title: "Practice 2",
                kind: "practice",
                startsAt: f1Fp.startsAt,
                endsAt: f1Fp.endsAt,
                watchOptions: {
                  create: [
                    {
                      platform: "F1 TV Pro",
                      url: "https://f1tv.formula1.com",
                      requiresPayment: true,
                      notes: "Most live Formula 1 track action is paywalled.",
                      sourceUrl: "https://www.formula1.com",
                      lastVerifiedAt: new Date(),
                    },
                  ],
                },
              },
              {
                title: "Race",
                kind: "race",
                startsAt: f1Race.startsAt,
                endsAt: f1Race.endsAt,
                watchOptions: {
                  create: [
                    {
                      platform: "F1 TV Pro",
                      url: "https://f1tv.formula1.com",
                      requiresPayment: true,
                      sourceUrl: "https://www.formula1.com",
                      lastVerifiedAt: new Date(),
                    },
                    {
                      platform: "YouTube (@Formula1 — highlights)",
                      url: "https://www.youtube.com/@Formula1",
                      requiresPayment: false,
                      notes:
                        "Free post-session highlights/clips appear on Formula 1 Official YouTube. Live lap-by-lap coverage varies by country and provider.",
                      sourceUrl: "https://www.formula1.com",
                      lastVerifiedAt: new Date(),
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    },
  });

  console.log(
    `Seeded demo IMSA + F1 (${f1Fp.startsAt.toISOString().slice(0, 10)} … ${imsRace.endsAt.toISOString().slice(0, 10)})`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
