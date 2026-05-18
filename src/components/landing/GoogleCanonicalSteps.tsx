import Link from "next/link";

/** Shared Google Calendar import / subscribe-from-URL instructions (shown once inside Other options). */
export function GoogleCanonicalSteps({
  googleImportHelp,
  googleSubscribeHelp,
}: {
  googleImportHelp: string;
  googleSubscribeHelp: string;
}) {
  return (
    <div className="space-y-5 text-[13px] leading-snug text-[var(--text-secondary)] lg:text-sm dark:text-zinc-300">
      <div className="rounded-xl border border-[var(--border-muted)] bg-[var(--surface-muted)] px-3 py-3 shadow-sm dark:border-emerald-500/25 dark:bg-emerald-950/30 dark:shadow-none">
        <p className="font-semibold text-emerald-900 dark:text-emerald-50">
          Recommended: import once (.ics)
        </p>
        <p className="mt-2 max-w-prose text-[12px] leading-relaxed lg:text-[13px] text-emerald-900/92 dark:text-emerald-100/95">
          Often the fastest way to see races in Google Calendar on the desktop. Subscribe by URL
          later if you prefer auto-refresh.
        </p>
        <ol className="mt-3 list-none space-y-2.5">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white shadow-sm motion-reduce:transition-none dark:bg-emerald-800/70">
              A
            </span>
            <span className="pt-px">
              In <strong className="text-emerald-800 dark:text-emerald-50">Other options</strong> tap{" "}
              <strong className="text-emerald-800 dark:text-emerald-50">Download .ics</strong> (same feed as{" "}
              <strong className="text-emerald-800 dark:text-emerald-50">Copy HTTPS feed</strong>).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white shadow-sm motion-reduce:transition-none dark:bg-emerald-800/70">
              B
            </span>
            <span className="pt-px flex flex-wrap items-center gap-x-2 gap-y-1">
              Open{" "}
              <Link
                href="https://calendar.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded font-medium text-orange-600 underline underline-offset-2 hover:text-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 dark:text-orange-400 dark:hover:text-orange-300"
              >
                calendar.google.com
              </Link>{" "}
              → <strong className="text-stone-900 dark:text-white">Settings</strong> (gear) →{" "}
              <strong className="text-stone-900 dark:text-white">Import &amp; Export</strong> →{" "}
              <strong className="text-stone-900 dark:text-white">Import</strong> and choose the file.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white shadow-sm motion-reduce:transition-none dark:bg-emerald-800/70">
              C
            </span>
            <span className="pt-px">
              Menu varies — see Google’s{" "}
              <Link
                href={googleImportHelp}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded font-medium text-orange-600 underline underline-offset-2 hover:text-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 dark:text-orange-400 dark:hover:text-orange-300"
              >
                import events
              </Link>{" "}
              guide.
            </span>
          </li>
        </ol>
      </div>

      <div>
        <p className="font-semibold text-stone-800 dark:text-zinc-200">
          Optional: subscribe by URL (auto-refresh)
        </p>
        <p className="mt-2 max-w-prose text-[12px] leading-relaxed text-stone-600 lg:text-[13px] dark:text-zinc-400">
          The first sync can lag; Calendar search often won’t find those events until they appear.
        </p>
        <ol className="mt-3 list-none space-y-3">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-700 text-xs font-semibold text-white shadow-sm dark:bg-zinc-700">
              1
            </span>
            <span className="pt-px">
              <strong className="text-stone-900 dark:text-white">Other options</strong> →{" "}
              <strong className="text-stone-900 dark:text-white">Copy HTTPS feed</strong>, paste in Google Calendar.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-700 text-xs font-semibold text-white shadow-sm dark:bg-zinc-700">
              2
            </span>
            <span className="pt-px">
              Beside <strong className="text-stone-900 dark:text-white">Other calendars</strong>,{" "}
              <strong className="text-stone-900 dark:text-white">+</strong> →{" "}
              <strong className="text-stone-900 dark:text-white">From URL</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-700 text-xs font-semibold text-white shadow-sm dark:bg-zinc-700">
              3
            </span>
            <span className="pt-px">
              See Google’s{" "}
              <Link
                href={googleSubscribeHelp}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded font-medium text-orange-600 underline underline-offset-2 hover:text-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 dark:text-orange-400 dark:hover:text-orange-300"
              >
                subscribe from URL
              </Link>{" "}
              article.
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}
