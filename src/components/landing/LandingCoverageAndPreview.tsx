"use client";

import type { SerializedPreviewSession } from "@/lib/landing-serialize";

export type LandingCoverageData = {
  series: { name: string; slug: string; category: string }[];
  seriesCount: number;
  sessionRowsTotal: number;
  upcomingTotal: number;
  refreshCadence: string;
};

type Props = {
  coverage: LandingCoverageData;
  previewSessions: SerializedPreviewSession[];
};

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function LandingCoverageAndPreview({ coverage, previewSessions }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="coverage-heading"
        className="rounded-2xl border border-[var(--border-muted-strong)] bg-[var(--surface-muted)]/80 p-4 sm:p-6 dark:border-zinc-700 dark:bg-zinc-900/65"
      >
        <h2
          id="coverage-heading"
          className="text-sm font-semibold text-stone-900 dark:text-zinc-100"
        >
          What’s in the database
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)] dark:text-zinc-400">
          <strong className="text-stone-800 dark:text-zinc-200">{coverage.seriesCount}</strong>{" "}
          series tracked,{" "}
          <strong className="text-stone-800 dark:text-zinc-200">
            {coverage.upcomingTotal}
          </strong>{" "}
          upcoming sessions (with at least one active watch link).{" "}
          <span className="whitespace-nowrap">
            {coverage.sessionRowsTotal} total session rows.
          </span>
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)] dark:text-zinc-500">
          {coverage.refreshCadence}
        </p>
        {coverage.series.length > 0 ?
          <ul className="mt-4 flex flex-wrap gap-2">
            {coverage.series.map((s) => (
              <li
                key={s.slug}
                className="rounded-full border border-[var(--border-muted)] bg-[var(--surface-elevated)] px-3 py-1 text-xs font-medium text-stone-700 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-300"
              >
                {s.name}
              </li>
            ))}
          </ul>
        : null}
      </section>

      <section
        aria-labelledby="preview-heading"
        className="rounded-2xl border border-[var(--border-muted-strong)] bg-[var(--surface-elevated)] p-4 sm:p-6 dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="preview-heading" className="text-sm font-semibold text-stone-900 dark:text-white">
            Next sessions (preview)
          </h2>
          <p className="text-[11px] text-[var(--text-muted)] dark:text-zinc-500">
            Same feed shape as ICS / Webcal before you subscribe.
          </p>
        </div>
        {previewSessions.length === 0 ?
          <p className="mt-3 text-sm text-[var(--text-secondary)] dark:text-zinc-400">
            No upcoming sessions with watch links — import data (see README) or run{" "}
            <code className="rounded bg-[var(--surface-muted)] px-1 text-[11px] dark:bg-zinc-800">
              npx prisma db seed
            </code>{" "}
            for a demo.
          </p>
        : <ul className="mt-4 divide-y divide-[var(--border-muted)] dark:divide-zinc-700">
            {previewSessions.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-0.5 py-3 first:pt-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-stone-900 dark:text-zinc-100">
                    <span className="text-[var(--text-secondary)] dark:text-zinc-500">
                      {row.seriesName}
                    </span>{" "}
                    · {row.eventName} — {row.title}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] dark:text-zinc-500">{row.venueName}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 pt-1 sm:justify-end sm:pt-0">
                  <time
                    dateTime={row.startsAt}
                    className="text-[13px] tabular-nums text-[var(--text-secondary)] dark:text-zinc-400"
                  >
                    {formatWhen(row.startsAt)}
                  </time>
                  {row.hasFreeOption ?
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                      Free option
                    </span>
                  : null}
                </div>
              </li>
            ))}
          </ul>
        }
      </section>
    </div>
  );
}
