import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "Notable publish-readiness work: ingestion, transparency, observability hooks, disclaimers.",
};

const ENTRIES = [
  {
    date: "May 2026",
    headline: "Snapshot ingest pipeline",
    body: "Upsert snapshots via REST (`POST /api/admin/import-snapshot`) or CLI (`npm run import:snapshot`). Attribution + archived watch-option flags landed in Prisma.",
  },
  {
    date: "May 2026",
    headline: "Landing transparency",
    body: "Coverage counters, preview of upcoming sessions from the DB, disclaimers/footer links, standalone Privacy/Terms/Changelog docs.",
  },
  {
    date: "May 2026",
    headline: "Health + observability",
    body: "`GET /api/health` returns DB latency; critical handlers emit JSON-lines friendly logs.",
  },
];

export default function ChangelogPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-[15px] leading-relaxed text-stone-800 dark:text-zinc-200 lg:py-24">
      <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
        RacerCalendar
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 dark:text-white">
        Changelog
      </h1>
      <p className="mt-6 text-[var(--text-secondary)] dark:text-zinc-400">
        Lightweight release notes retained in-repo—expand per fleet if you customize upstream.
      </p>
      <ol className="mt-12 space-y-10">
        {ENTRIES.map((e) => (
          <li key={e.headline}>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-zinc-500">
              {e.date}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-stone-900 dark:text-white">{e.headline}</h2>
            <p className="mt-2 text-[var(--text-secondary)] dark:text-zinc-400">{e.body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-14">
        <Link href="/" className="font-medium text-orange-600 underline hover:text-orange-800 dark:text-orange-400">
          ← Home
        </Link>
      </p>
    </main>
  );
}
