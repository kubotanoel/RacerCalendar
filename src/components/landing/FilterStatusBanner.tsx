type DbTotals = { sessionRows: number; upcomingRows: number };

type Props = {
  sessionCount: number | null;
  dbTotals: DbTotals | null;
  /** Are any filter controls (categories or free-only) currently restricting results? */
  filtersActive?: boolean;
  /** Reset every filter (clear categories, free-only off). Required for the empty-state action. */
  onResetFilters?: () => void;
};

export function FilterStatusBanner({
  sessionCount,
  dbTotals,
  filtersActive = false,
  onResetFilters,
}: Props) {
  if (sessionCount === null) return null;

  const commonCard =
    "rounded-xl border px-4 py-3 text-sm shadow-sm motion-reduce:transition-none";

  if (sessionCount === 0) {
    if (dbTotals?.sessionRows === 0) {
      return (
        <div
          className={`${commonCard} border-rose-200 bg-[var(--surface-muted)] text-rose-900 dark:border-rose-500/35 dark:bg-rose-950/40 dark:text-rose-100 dark:shadow-none`}
        >
          <p className="font-medium text-stone-900 dark:text-white">Race data hasn’t been loaded.</p>
          <p className="mt-2 max-w-prose text-xs leading-relaxed text-rose-800 dark:text-rose-100/95">
            Migrations ran, but nobody ran the <strong>seed</strong> yet, so there are zero sessions in the database.
            Whoever maintains this site needs to run once against production (with the production{" "}
            <code className="rounded bg-rose-200/65 px-1 py-px text-[11px] dark:bg-black/30">
              DATABASE_URL
            </code>
            ):{" "}
            <code className="rounded bg-rose-200/65 px-1 py-px text-[11px] whitespace-pre-wrap dark:bg-black/30">
              npx prisma db seed
            </code>{" "}
            then refresh this page.
          </p>
        </div>
      );
    }
    if (dbTotals && dbTotals.upcomingRows === 0 && dbTotals.sessionRows > 0) {
      return (
        <div
          className={`${commonCard} border-amber-200 bg-[var(--surface-muted)] text-amber-950 dark:border-amber-500/35 dark:bg-amber-500/12 dark:text-amber-50 dark:shadow-none`}
        >
          <p className="font-medium text-amber-900 dark:text-amber-50">
            Stored races exist, but they’re all in the past.
          </p>
          <p className="mt-2 max-w-prose text-xs leading-relaxed text-amber-900 dark:text-amber-100/95">
            Re-run seed to generate future weekends, or add new schedules in the database.
          </p>
        </div>
      );
    }
    if (dbTotals && dbTotals.upcomingRows > 0) {
      return (
        <div
          className={`${commonCard} border-amber-200 bg-[var(--surface-muted)] text-amber-950 dark:border-amber-500/35 dark:bg-amber-500/12 dark:text-amber-50 dark:shadow-none`}
        >
          <p className="font-medium text-amber-900 dark:text-amber-50">Nothing matches these filters.</p>
          <p className="mt-2 max-w-prose text-xs leading-relaxed text-amber-900 dark:text-amber-200/90">
            There are{" "}
            <strong className="text-amber-900 dark:text-amber-50">{dbTotals.upcomingRows}</strong>{" "}
            upcoming race {dbTotals.upcomingRows === 1 ? "session" : "sessions"} in the database, but none match what you chose.
          </p>
          {filtersActive && onResetFilters ?
            <div className="mt-3">
              <button
                type="button"
                onClick={onResetFilters}
                className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-amber-600 px-3 py-2 text-[13px] font-medium text-white shadow-sm transition hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-400"
              >
                Reset filters · show every upcoming race
              </button>
            </div>
          : null}
        </div>
      );
    }
    return (
      <div
        className={`${commonCard} border-amber-200 bg-[var(--surface-muted)] text-amber-950 dark:border-amber-500/35 dark:bg-amber-500/12 dark:text-amber-50 dark:shadow-none`}
      >
        <p className="font-medium text-amber-900 dark:text-amber-50">Nothing matches yet.</p>
        <p className="mt-2 max-w-prose text-xs leading-relaxed text-amber-950 dark:text-amber-200/90">
          Try relaxing filters first. If it’s still empty, your host may need to seed race data (
          <code className="rounded bg-amber-200/65 px-1 py-px text-[11px] dark:bg-black/25">
            npx prisma db seed
          </code>
          ).
        </p>
        {filtersActive && onResetFilters ?
          <div className="mt-3">
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-amber-600 px-3 py-2 text-[13px] font-medium text-white shadow-sm transition hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-400"
            >
              Reset filters
            </button>
          </div>
        : null}
      </div>
    );
  }

  return (
    <div
      className={`${commonCard} border-emerald-200 bg-[var(--surface-muted)] py-2.5 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-950/35 dark:text-emerald-100 dark:shadow-none`}
    >
      <strong className="text-emerald-800 dark:text-emerald-50">{sessionCount}</strong>{" "}
      {sessionCount === 1 ? "race session" : "race sessions"} in this feed — in Google Calendar,{" "}
      <strong className="text-emerald-800 dark:text-emerald-50">Import</strong> usually shows events right away;{" "}
      <strong className="text-emerald-800 dark:text-emerald-50">From URL</strong> subscriptions can lag and search
      often skips them until they arrive.
    </div>
  );
}
