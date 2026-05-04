import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Usage terms for operators and visitors of deployments of RacerCalendar (software only; not legal advice).",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-[15px] leading-relaxed text-stone-800 dark:text-zinc-200 lg:py-24">
      <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
        RacerCalendar
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 dark:text-white">
        Terms
      </h1>
      <p className="mt-8 font-medium text-orange-950 dark:text-orange-200">
        This is shorthand guidance for OSS deployments—not legal counsel. Customize per jurisdiction
        before a public-facing commercial launch.
      </p>
      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-white">Nature of service</h2>
        <p className="text-[var(--text-secondary)] dark:text-zinc-400">
          Calendar entries include scheduled session timestamps and indicative watch descriptors.
          Streams, broadcast rights, and pricing change often; verifying availability locally is entirely
          the user&apos;s responsibility.
        </p>
      </section>
      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-white">Disclaimer of warranty</h2>
        <p className="text-[var(--text-secondary)] dark:text-zinc-400">
          The codebase is supplied &quot;as-is&quot;. Operators indemnify themselves for downtime of
          third-party calendars, publishers, OAuth providers, databases, DNS, cron jobs, secrets
          rotations, ingestion mistakes, etc.
        </p>
      </section>
      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-white">Data imports</h2>
        <p className="text-[var(--text-secondary)] dark:text-zinc-400">
          Snapshot imports overwrite watch options tied to synced sessions via the ingestion contract.
          Back up Postgres before experimenting in production environments.
        </p>
      </section>
      <p className="mt-12">
        <Link href="/" className="font-medium text-orange-600 underline hover:text-orange-800 dark:text-orange-400">
          ← Home
        </Link>
      </p>
    </main>
  );
}
