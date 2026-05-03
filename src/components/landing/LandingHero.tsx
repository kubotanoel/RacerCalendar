export function LandingHero() {
  return (
    <header className="space-y-3 lg:space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600 dark:text-orange-400">
        RacerCalendar
      </p>
      <h1 className="max-w-xl text-pretty bg-gradient-to-r from-orange-900 via-orange-950 to-violet-900 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-[2.65rem] sm:leading-[1.1] lg:max-w-2xl lg:text-5xl xl:text-[3.25rem] xl:leading-[1.08] dark:from-orange-100 dark:via-white dark:to-violet-200">
        Racing you can watch, straight in Google Calendar
      </h1>
      <p className="max-w-xl text-pretty text-[15px] leading-relaxed text-[var(--text-secondary)] lg:leading-relaxed dark:text-zinc-400">
        Pick what you care about once. Prefer{" "}
        <strong className="font-medium text-stone-800 dark:text-zinc-200">Add to Calendar</strong> on this page when
        you can — otherwise the steps below spell out exactly which menus to tap.
      </p>
    </header>
  );
}
