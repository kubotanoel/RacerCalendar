import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How RacerCalendar handles OAuth, feeds, analytics, and data you send when using this calendar service.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-[15px] leading-relaxed text-stone-800 dark:text-zinc-200 lg:py-24">
      <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
        RacerCalendar
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 dark:text-white">
        Privacy
      </h1>
      <p className="mt-8 text-[var(--text-secondary)] dark:text-zinc-400">
        This site displays racing sessions and can integrate with Google Calendar. Operators who
        deploy their own fork should customise this policy with jurisdictional specifics and hosting
        contact details.
      </p>
      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-white">
          Data that passes through this service
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-[var(--text-secondary)] dark:text-zinc-400">
          <li>
            <strong className="text-stone-800 dark:text-zinc-200">Webcal signing</strong>: filter
            choices are summarized into JWT-like signed tokens validated server-side via{" "}
            <code className="rounded bg-[var(--surface-muted)] px-1 text-[13px] dark:bg-zinc-800">
              CALENDAR_FEED_SECRET
            </code>
            .
          </li>
          <li>
            <strong className="text-stone-800 dark:text-zinc-200">Google OAuth</strong>, when enabled,
            persists refresh tokens in your Postgres-backed database—the security of stored tokens is
            the operator&apos;s responsibility.
          </li>
          <li>
            Logs emitted from API routes aim to be structured JSON-ish lines for ingestion by log
            drains.
          </li>
        </ul>
      </section>
      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-white">
          Streams and publishers
        </h2>
        <p className="text-[var(--text-secondary)] dark:text-zinc-400">
          Watch descriptors link to publishers (streaming platforms); visiting them is governed by
          their policies—not this codebase.
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
