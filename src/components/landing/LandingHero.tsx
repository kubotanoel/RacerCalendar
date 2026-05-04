export function LandingHero() {
  return (
    <header className="rounded-2xl border border-[var(--border-muted)] bg-gradient-to-br from-[var(--surface-elevated)] via-[var(--surface-muted)]/40 to-transparent p-6 shadow-sm dark:from-zinc-900 dark:via-zinc-900/80 dark:to-zinc-950/40 dark:shadow-none sm:p-8 lg:rounded-3xl lg:border-[var(--border-muted-strong)] lg:p-10 lg:shadow-[var(--shadow-card)] xl:flex xl:items-stretch xl:justify-between xl:gap-16 xl:p-12 2xl:gap-20 2xl:p-14">
      <div className="min-w-0 xl:max-w-[min(100%,42rem)] 2xl:max-w-[46rem]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600 dark:text-orange-400">
          RacerCalendar
        </p>
        <h1 className="mt-3 max-w-[22ch] text-pretty bg-gradient-to-r from-orange-900 via-orange-950 to-violet-900 bg-clip-text text-[2rem] font-semibold leading-[1.12] tracking-tight text-transparent sm:text-[2.55rem] sm:leading-[1.1] lg:mt-4 lg:max-w-none lg:text-5xl lg:leading-[1.08] xl:text-[3.15rem] xl:leading-[1.06] 2xl:text-[3.5rem] dark:from-orange-100 dark:via-white dark:to-violet-200">
          Racing you can watch, straight in Google Calendar
        </h1>
        <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-[var(--text-secondary)] sm:text-[17px] lg:mt-5 lg:max-w-2xl lg:text-lg lg:leading-relaxed dark:text-zinc-400">
          Curated sessions with free vs paid streams, filters you control, and a calendar link that stays in sync with your choices.
        </p>
      </div>

      <aside
        aria-label="How it works"
        className="hidden flex-col justify-center border-l border-[var(--border-muted)] text-[var(--text-secondary)] dark:border-zinc-700 dark:text-zinc-400 xl:flex xl:max-w-[17.5rem] xl:shrink-0 xl:pl-10 2xl:max-w-[19rem] 2xl:pl-12"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-zinc-500">
          How it works
        </p>
        <ol className="mt-4 space-y-4 text-sm leading-snug text-stone-700 dark:text-zinc-300">
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-xs font-bold text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
              1
            </span>
            <span>
              <span className="font-medium text-stone-900 dark:text-zinc-100">Pick series</span> and whether to show only free streams.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs font-bold text-violet-800 dark:bg-violet-400/25 dark:text-violet-200">
              2
            </span>
            <span>
              <span className="font-medium text-stone-900 dark:text-zinc-100">Add the shared Google calendar</span> or your personal Webcal link.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-200">
              3
            </span>
            <span>
              Optional: <span className="font-medium text-stone-900 dark:text-zinc-100">connect Google</span> for push sync into your own Gmail calendar.
            </span>
          </li>
        </ol>
      </aside>
    </header>
  );
}
