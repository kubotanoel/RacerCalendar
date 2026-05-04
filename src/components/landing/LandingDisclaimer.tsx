"use client";

import Link from "next/link";

/** Short legal/disclaimer footer for feeds and streaming */
export function LandingDisclaimer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-muted)]/65 p-4 text-[12px] leading-relaxed text-[var(--text-secondary)] dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400 ${className}`}
    >
      <p>
        <strong className="text-stone-800 dark:text-zinc-200">
          Streams and broadcast rights vary by region and change often.
        </strong>{" "}
        Links are informational; RacerCalendar is not a broadcaster. Verify listings with providers
        before events. ICS/Webcal/Google sync depends on hosts maintaining calendar secrets and
        data imports—see docs for operators.
      </p>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-medium">
        <Link href="/privacy" className="text-orange-700 underline underline-offset-2 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300">
          Privacy
        </Link>
        <Link href="/terms" className="text-orange-700 underline underline-offset-2 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300">
          Terms
        </Link>
        <Link href="/changelog" className="text-orange-700 underline underline-offset-2 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300">
          Changelog
        </Link>
        <Link
          href="/api/health"
          className="text-orange-700 underline underline-offset-2 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
          target="_blank"
          rel="noreferrer"
        >
          Service health (JSON)
        </Link>
      </p>
    </div>
  );
}
