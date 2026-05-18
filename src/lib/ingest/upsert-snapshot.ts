import type { Category, Prisma } from "@prisma/client";
import { Category as CategoryValues } from "@prisma/client";

import type {
  SnapshotBundleInput,
  SnapshotEventInput,
  SnapshotSeriesInput,
  SnapshotSessionInput,
} from "@/lib/ingest/snapshot-types";
import { prisma } from "@/lib/prisma";

const CATEGORY_SET = new Set<string>(Object.values(CategoryValues));

function iso(d: unknown, label: string): Date {
  if (typeof d !== "string") throw new Error(`${label}: expected ISO date string`);
  const out = new Date(d);
  if (Number.isNaN(out.getTime())) throw new Error(`${label}: invalid date "${d}"`);
  return out;
}

function coerceBundle(body: unknown): SnapshotBundleInput {
  if (!body || typeof body !== "object") throw new Error("Body must be a JSON object");
  const series = (body as { series?: unknown }).series;
  if (!Array.isArray(series)) throw new Error('Expected top-level property "series" (array)');
  const replace = (body as { replace?: unknown }).replace;
  if (replace !== undefined && typeof replace !== "boolean") {
    throw new Error('Top-level "replace" must be a boolean if present');
  }
  return body as SnapshotBundleInput;
}

function assertSeries(s: SnapshotSeriesInput, i: number): void {
  if (typeof s.slug !== "string" || !s.slug.trim()) throw new Error(`series[${i}].slug required`);
  if (typeof s.name !== "string" || !s.name.trim()) throw new Error(`series[${i}].name required`);
  if (typeof s.category !== "string" || !CATEGORY_SET.has(s.category)) {
    throw new Error(
      `series[${i}].category invalid: ${JSON.stringify(s.category)} (use Prisma Category enum value)`,
    );
  }
  if (!Array.isArray(s.events)) throw new Error(`series[${i}].events must be an array`);
}

async function upsertWatchOptionsForSession(
  tx: Prisma.TransactionClient,
  sessionId: string,
  options: SnapshotSessionInput["watchOptions"],
): Promise<void> {
  await tx.watchOption.deleteMany({ where: { sessionId } });

  const rows =
    Array.isArray(options) && options.length > 0 ?
      options.map((w) => {
        if (typeof w.platform !== "string" || !w.platform.trim())
          throw new Error("watchOptions[].platform required");
        if (typeof w.url !== "string" || !w.url.trim()) throw new Error("watchOptions[].url required");
        return {
          sessionId,
          platform: w.platform.trim(),
          url: w.url.trim(),
          requiresPayment: w.requiresPayment !== false,
          notes: typeof w.notes === "string" ? w.notes : w.notes == null ? null : String(w.notes),
          regions:
            typeof w.regions === "string" ? w.regions : w.regions == null ? null : String(w.regions),
          sourceUrl:
            typeof w.sourceUrl === "string" ?
              w.sourceUrl
            : w.sourceUrl == null ? null
            : String(w.sourceUrl),
          lastVerifiedAt:
            typeof w.lastVerifiedAt === "string" ? iso(w.lastVerifiedAt, "lastVerifiedAt") : null,
          archived: w.archived === true,
        };
      })
    : [];

  if (rows.length) await tx.watchOption.createMany({ data: rows });
}

async function upsertSession(
  tx: Prisma.TransactionClient,
  eventId: string,
  sess: SnapshotSessionInput,
): Promise<void> {
  if (typeof sess.title !== "string" || !sess.title.trim())
    throw new Error("session.title required");

  const startsAt = iso(sess.startsAt, "startsAt");
  const endsAt = iso(sess.endsAt, "endsAt");

  const dataCommon = {
    title: sess.title.trim(),
    kind: typeof sess.kind === "string" ? sess.kind : sess.kind == null ? null : String(sess.kind),
    startsAt,
    endsAt,
    dataSourceUrl:
      typeof sess.dataSourceUrl === "string" ?
        sess.dataSourceUrl
      : sess.dataSourceUrl == null ? null
      : String(sess.dataSourceUrl),
  };

  const ext =
    typeof sess.externalKey === "string" && sess.externalKey.trim() ?
      sess.externalKey.trim()
    : null;

  let sessionId: string;

  if (ext) {
    const row = await tx.session.upsert({
      where: {
        eventId_externalKey: { eventId, externalKey: ext },
      },
      create: {
        eventId,
        externalKey: ext,
        ...dataCommon,
      },
      update: dataCommon,
    });
    sessionId = row.id;
  } else {
    const hit = await tx.session.findFirst({
      where: {
        eventId,
        title: sess.title.trim(),
        startsAt,
        externalKey: null,
      },
    });
    if (hit) {
      await tx.session.update({
        where: { id: hit.id },
        data: dataCommon,
      });
      sessionId = hit.id;
    } else {
      const created = await tx.session.create({
        data: {
          eventId,
          externalKey: null,
          ...dataCommon,
        },
      });
      sessionId = created.id;
    }
  }

  await upsertWatchOptionsForSession(tx, sessionId, sess.watchOptions);
}

async function upsertEvent(tx: Prisma.TransactionClient, seriesId: string, ev: SnapshotEventInput) {
  if (typeof ev.slug !== "string" || !ev.slug.trim()) throw new Error("event.slug required");
  if (typeof ev.name !== "string" || !ev.name.trim()) throw new Error("event.name required");
  if (typeof ev.venueName !== "string" || !ev.venueName.trim())
    throw new Error("event.venueName required");
  if (typeof ev.timezone !== "string" || !ev.timezone.trim())
    throw new Error("event.timezone required");

  const event = await tx.event.upsert({
    where: { seriesId_slug: { seriesId, slug: ev.slug.trim() } },
    create: {
      seriesId,
      slug: ev.slug.trim(),
      name: ev.name.trim(),
      venueName: ev.venueName.trim(),
      timezone: ev.timezone.trim(),
      startDate: iso(ev.startDate, "startDate"),
      endDate:
        typeof ev.endDate === "string" && ev.endDate.trim() ?
          iso(ev.endDate, "endDate")
        : ev.endDate == null ? null
        : (() => {
            throw new Error("event.endDate must be ISO string or null");
          })(),
      ingestSource:
        typeof ev.ingestSource === "string" && ev.ingestSource.trim() ?
          ev.ingestSource.trim()
        : "manual",
      dataSourceUrl:
        typeof ev.dataSourceUrl === "string" ?
          ev.dataSourceUrl
        : ev.dataSourceUrl == null ? null
        : String(ev.dataSourceUrl),
    },
    update: {
      name: ev.name.trim(),
      venueName: ev.venueName.trim(),
      timezone: ev.timezone.trim(),
      startDate: iso(ev.startDate, "startDate"),
      endDate:
        typeof ev.endDate === "string" && ev.endDate.trim() ?
          iso(ev.endDate, "endDate")
        : ev.endDate == null ? null
        : (() => {
            throw new Error("event.endDate must be ISO string or null");
          })(),
      ingestSource:
        typeof ev.ingestSource === "string" && ev.ingestSource.trim() ?
          ev.ingestSource.trim()
        : undefined,
      dataSourceUrl:
        typeof ev.dataSourceUrl === "string" ?
          ev.dataSourceUrl
        : ev.dataSourceUrl == null ? null
        : String(ev.dataSourceUrl),
    },
  });

  const sessionList = ev.sessions;
  if (!Array.isArray(sessionList)) throw new Error("event.sessions must be an array");
  for (const s of sessionList) await upsertSession(tx, event.id, s);
}

/**
 * Upsert series/events/sessions/watch options from structured JSON (idempotent by slug + session keys).
 */
export async function upsertSnapshotFromJson(body: unknown): Promise<{
  seriesUpserted: number;
  eventsUpserted: number;
  sessionsUpserted: number;
  replaced: boolean;
  seriesDeleted: number;
}> {
  const bundle = coerceBundle(body);
  let seriesUpserted = 0;
  let eventsUpserted = 0;
  let sessionsUpserted = 0;
  let seriesDeleted = 0;
  const replaced = bundle.replace === true;

  await prisma.$transaction(
    async (tx) => {
      if (replaced) {
        const { count } = await tx.series.deleteMany({});
        seriesDeleted = count;
      }
      for (let i = 0; i < bundle.series.length; i++) {
        const s = bundle.series[i]!;
        assertSeries(s, i);

        const series = await tx.series.upsert({
          where: { slug: s.slug.trim() },
          create: {
            slug: s.slug.trim(),
            name: s.name.trim(),
            category: s.category as Category,
            ingestSource:
              typeof s.ingestSource === "string" && s.ingestSource.trim() ?
                s.ingestSource.trim()
              : "manual",
            dataSourceUrl:
              typeof s.dataSourceUrl === "string" ?
                s.dataSourceUrl
              : s.dataSourceUrl == null ? null
              : String(s.dataSourceUrl),
            licenseNotes:
              typeof s.licenseNotes === "string" ?
                s.licenseNotes
              : s.licenseNotes == null ? null
              : String(s.licenseNotes),
          },
          update: {
            name: s.name.trim(),
            category: s.category as Category,
            ingestSource:
              typeof s.ingestSource === "string" && s.ingestSource.trim() ?
                s.ingestSource.trim()
              : undefined,
            dataSourceUrl:
              typeof s.dataSourceUrl === "string" ?
                s.dataSourceUrl
              : s.dataSourceUrl == null ? null
              : String(s.dataSourceUrl),
            licenseNotes:
              typeof s.licenseNotes === "string" ?
                s.licenseNotes
              : s.licenseNotes == null ? null
              : String(s.licenseNotes),
          },
        });
        seriesUpserted += 1;

        for (const ev of s.events) {
          await upsertEvent(tx, series.id, ev);
          eventsUpserted += 1;
          const sl = ev.sessions;
          if (Array.isArray(sl)) sessionsUpserted += sl.length;
        }
      }
    },
    { timeout: 120_000 },
  );

  return { seriesUpserted, eventsUpserted, sessionsUpserted, replaced, seriesDeleted };
}
