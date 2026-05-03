import { Category } from "@prisma/client";

import { prisma } from "../src/lib/prisma";

async function main() {
  await prisma.googleAccount.deleteMany();
  await prisma.series.deleteMany();

  await prisma.series.create({
    data: {
      name: "IMSA WeatherTech SportsCar Championship",
      slug: "imsa-weathertech",
      category: Category.SPORTSCAR,
      events: {
        create: {
          name: "Sahlens Six Hours of The Glen",
          slug: "2026-six-hours-of-the-glen",
          venueName: "Watkins Glen International",
          timezone: "America/New_York",
          startDate: new Date("2026-06-18T08:00:00.000Z"),
          endDate: new Date("2026-06-22T04:00:00.000Z"),
          sessions: {
            create: [
              {
                title: "Qualifying",
                kind: "qualifying",
                startsAt: new Date("2026-06-20T19:05:00.000Z"),
                endsAt: new Date("2026-06-20T19:55:00.000Z"),
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
                startsAt: new Date("2026-06-21T17:40:00.000Z"),
                endsAt: new Date("2026-06-21T23:40:00.000Z"),
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
          slug: "2026-monaco",
          venueName: "Circuit de Monaco",
          timezone: "Europe/Monaco",
          startDate: new Date("2026-05-21T00:00:00.000Z"),
          endDate: new Date("2026-05-25T06:00:00.000Z"),
          sessions: {
            create: [
              {
                title: "Practice 2",
                kind: "practice",
                startsAt: new Date("2026-05-23T11:35:00.000Z"),
                endsAt: new Date("2026-05-23T12:25:00.000Z"),
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
                startsAt: new Date("2026-05-24T13:40:00.000Z"),
                endsAt: new Date("2026-05-24T17:36:36.000Z"),
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

  console.log("Seeded IMSA WeatherTech + Formula 1 with demo sessions.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
