import Link from "next/link";

/** Device quirks and shortcuts only (no duplicated import ladder). */
export function GoogleCompactHelp({
  googleWebImportExport,
  googleReady,
  scrollToEasiestGoogle,
}: {
  googleWebImportExport: string;
  googleReady: boolean;
  scrollToEasiestGoogle: () => void;
}) {
  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/98 px-3 py-3 leading-relaxed motion-reduce:transition-none dark:border-sky-500/25 dark:bg-sky-950/35">
      <p className="font-medium text-sky-950 dark:text-sky-100">Phones &amp; uneven UIs?</p>
      <p className="mt-2 max-w-prose text-[12px] text-sky-900 dark:text-sky-100/90">
        <strong className="text-stone-950 dark:text-white">Add to Calendar</strong> opens your subscribed app;{" "}
        <strong className="text-stone-950 dark:text-white">Download .ics</strong> from Files often works too.
        {googleReady ?
          <>
            {" "}
            Or{" "}
            <button
              type="button"
              className="-mx-px rounded font-medium text-orange-600 underline decoration-orange-400/40 underline-offset-2 hover:text-orange-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 dark:text-orange-300 dark:hover:text-orange-200"
              onClick={scrollToEasiestGoogle}
            >
              connect Google below
            </button>{" "}
            so we sync into Gmail from the server.
          </>
        : null}{" "}
        <Link
          href={googleWebImportExport}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded font-medium text-orange-600 underline underline-offset-2 hover:text-orange-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 dark:text-orange-300 dark:hover:text-orange-200"
        >
          Gmail import &amp; export
        </Link>
        {" · "}
        <Link
          href="https://formulacalendar.com/subscribe/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded font-medium text-orange-600 underline underline-offset-2 hover:text-orange-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 dark:text-orange-300 dark:hover:text-orange-200"
        >
          Formula&nbsp;Calendar
        </Link>
        .
      </p>
    </div>
  );
}
