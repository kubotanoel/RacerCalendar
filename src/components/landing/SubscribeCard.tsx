"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { GoogleCanonicalSteps } from "@/components/landing/GoogleCanonicalSteps";
import { GoogleCompactHelp } from "@/components/landing/GoogleCompactHelp";

export type PublicCalState = {
  credentialsConfigured: boolean;
  calendarId: string | null;
  subscribeHref: string | null;
} | null;

type UrlBundle = {
  googleImportHelp: string;
  googleSubscribeHelp: string;
  appleSubscribedCalendarHelp: string;
  googleWebAddByUrl: string;
  googleWebImportExport: string;
};

type Props = {
  cardId: string;
  publicGoogleCal: PublicCalState;
  googleHeroSidecar: boolean;
  webcalFeedUrl: string;
  linkLoading: boolean;
  signErr: string;
  feedUrl: string;
  copyUrl: () => void;
  copied: boolean;
  downloadIcsFile: () => void;
  downloadBusy: boolean;
  copyPublicCalendarId: () => void;
  copiedCalId: boolean;
  googleReady: boolean;
  otherOptionsOpen: boolean;
  onToggleOtherOptions: () => void;
  urls: UrlBundle;
};

function PrimarySkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`min-h-14 w-full rounded-2xl bg-stone-200/95 motion-reduce:animate-none animate-pulse dark:bg-zinc-700/85 sm:min-h-[3.25rem] ${className ?? ""}`}
    />
  );
}

function PathChoiceStrip({ googleHeroSidecar }: { googleHeroSidecar: boolean }) {
  return (
    <div className="mt-3 rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-muted)] px-3 py-2.5 text-[13px] leading-snug shadow-sm motion-reduce:transition-none dark:border-zinc-700 dark:bg-zinc-900/60 dark:shadow-none sm:mt-4 sm:px-4 sm:py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 dark:text-zinc-500 sm:text-xs">
        Choose your path
      </p>
      <ul
        className={`mt-2 gap-2 text-[var(--text-secondary)] dark:text-zinc-400 sm:gap-3 ${googleHeroSidecar ? "grid max-sm:grid-cols-1 sm:grid-cols-2 sm:gap-x-4" : "space-y-2"}`}
      >
        {googleHeroSidecar ?
          <li>
            <span className="font-semibold text-violet-700 dark:text-violet-300">Google in the browser</span>{" "}
            — use{" "}
            <span className="font-semibold text-stone-900 dark:text-zinc-100">Add to Google Calendar</span> for our
            shared schedule (same races for everyone).
          </li>
        : null}
        <li>
          <span className="font-semibold text-emerald-700 dark:text-emerald-300">Apple / Outlook / ICS</span>{" "}
          — use{" "}
          <span className="font-semibold text-stone-900 dark:text-zinc-100">Add to Calendar</span>; it respects your{" "}
          series + free-stream filters via Webcal when your feed finishes loading below.
        </li>
      </ul>
    </div>
  );
}

export function SubscribeCard({
  cardId,
  publicGoogleCal,
  googleHeroSidecar,
  webcalFeedUrl,
  linkLoading,
  signErr,
  feedUrl,
  copyUrl,
  copied,
  downloadIcsFile,
  downloadBusy,
  copyPublicCalendarId,
  copiedCalId,
  googleReady,
  otherOptionsOpen,
  onToggleOtherOptions,
  urls,
}: Props) {
  const scrollToEasiestGoogle = () => {
    document.getElementById("easiest-google")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      id={cardId}
      aria-busy={linkLoading}
      className="scroll-mt-[5.5rem] overflow-hidden rounded-2xl border border-[var(--border-muted-strong)] bg-[var(--surface-elevated)] p-4 shadow-[var(--shadow-card)] backdrop-blur-sm motion-reduce:transition-none sm:scroll-mt-24 sm:rounded-3xl sm:p-6 lg:scroll-mt-28 lg:p-8 dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/35"
    >
      <header className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-stone-900 dark:text-white sm:text-2xl">
          Get races on your calendar
        </h2>
        <p className="text-base leading-relaxed text-[var(--text-secondary)] dark:text-zinc-400 sm:text-[15px] sm:leading-relaxed">
          One shared Google calendar, or your personal Webcal link — both follow the filters you set.
        </p>
      </header>

      <PathChoiceStrip googleHeroSidecar={googleHeroSidecar} />

      <div
        className={`mt-5 grid w-full gap-2.5 max-sm:grid-cols-1 sm:mt-6 sm:gap-3 ${googleHeroSidecar ? "sm:grid-cols-2" : ""}`}
      >
        {publicGoogleCal?.subscribeHref ?
          <a
            href={publicGoogleCal.subscribeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 px-4 py-3.5 text-center text-base font-semibold text-white shadow-lg shadow-violet-950/50 ring-1 ring-white/10 transition motion-reduce:transition-none active:brightness-95 sm:min-h-[3.25rem] sm:px-5 sm:text-[15px] hover:from-violet-400 hover:to-violet-500 hover:shadow-violet-900/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 max-sm:active:scale-[0.99] motion-reduce:active:scale-100"
          >
            <span className="drop-shadow-sm">Add to Google Calendar</span>
          </a>
        : publicGoogleCal?.credentialsConfigured ?
          <div className="flex min-h-14 flex-col justify-center rounded-2xl border border-dashed border-violet-300 bg-[var(--surface-muted)] px-4 py-3 text-center dark:border-violet-500/40 dark:bg-violet-950/30 sm:min-h-[3.25rem]">
            <span className="text-sm font-semibold text-violet-900 dark:text-violet-200">Add to Google Calendar</span>
            <span className="mt-1 text-[11px] text-violet-800 dark:text-violet-300/90">
              First sync pending — host runs service-sync once.
            </span>
          </div>
        : null}

        {linkLoading && !signErr ?
          <PrimarySkeleton />
        : webcalFeedUrl && !signErr ?
          <a
            href={webcalFeedUrl}
            rel="noopener noreferrer"
            className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-3.5 text-center text-base font-semibold text-white shadow-lg shadow-emerald-950/45 ring-1 ring-white/10 transition motion-reduce:transition-none active:brightness-95 max-sm:active:scale-[0.99] motion-reduce:active:scale-100 sm:min-h-[3.25rem] sm:col-span-1 sm:px-5 sm:text-[15px] hover:from-emerald-400 hover:to-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            <span>Add to Calendar</span>
          </a>
        : <span
            className={`inline-flex min-h-14 w-full cursor-not-allowed items-center justify-center rounded-2xl border border-[var(--border-muted-strong)] bg-stone-100 px-4 py-3.5 text-center text-base font-semibold text-[var(--text-muted)] shadow-inner shadow-white/75 motion-reduce:transition-none dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-500 dark:shadow-none sm:min-h-[3.25rem] sm:px-5 sm:text-[15px] ${signErr ? "opacity-35" : linkLoading ? "opacity-55" : "opacity-50"}`}
            aria-disabled="true"
          >
            Add to Calendar
          </span>
        }
      </div>

      <p className="mx-auto mt-4 max-w-prose text-center text-[14px] leading-snug text-[var(--text-secondary)] motion-reduce:transition-none sm:mx-0 sm:text-left">
        <strong className="font-medium text-stone-900 dark:text-zinc-200">Google</strong> subscription is identical for all
        users.&nbsp;
        <strong className="font-medium text-stone-900 dark:text-zinc-200">Webcal</strong> follows your picks (
        <span>{linkLoading ? "preparing feed…" : "subscription link ready"}</span>).
      </p>

      <button
        type="button"
        aria-expanded={otherOptionsOpen}
        onClick={onToggleOtherOptions}
        className="mt-6 flex min-h-[3.25rem] w-full touch-manipulation items-center justify-between gap-3 rounded-2xl border border-[var(--border-muted-strong)] bg-[var(--surface-muted)] px-4 py-4 text-left shadow-sm transition motion-reduce:transition-none hover:border-orange-400/70 hover:bg-[var(--surface-elevated)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 active:bg-[var(--surface-elevated)] dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-zinc-600 dark:hover:bg-zinc-900 dark:active:bg-zinc-900 sm:mt-7 sm:py-3.5"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <ChevronDown
            className={`size-5 shrink-0 text-orange-600 transition-transform motion-reduce:transition-none dark:text-orange-400 ${otherOptionsOpen ? "duration-300 motion-reduce:duration-0 -rotate-180" : ""}`}
            strokeWidth={2.25}
            aria-hidden
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-stone-900 dark:text-zinc-100">Other options</span>
            <span className="mt-0.5 block text-[13px] font-normal text-[var(--text-secondary)] dark:text-zinc-500">
              Download, copy links, calendar ID, full Google steps
            </span>
          </span>
        </span>
      </button>

      {otherOptionsOpen ?
        <div className="motion-reduce:animate-none mt-3 space-y-4 rounded-2xl border border-[var(--border-muted)] bg-[var(--surface-muted)] p-4 shadow-inner dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!feedUrl || linkLoading || !!signErr || downloadBusy}
              onClick={() => void downloadIcsFile()}
              className="touch-manipulation rounded-xl border border-[var(--border-muted-strong)] bg-[var(--surface-elevated)] px-3.5 py-2.5 text-[13px] font-medium text-stone-800 shadow-sm hover:bg-[var(--surface-muted)] disabled:pointer-events-none disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 active:scale-[0.99] motion-reduce:active:scale-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 max-sm:min-h-11"
            >
              {downloadBusy ? "Downloading…" : "Download .ics"}
            </button>
            <button
              type="button"
              disabled={!feedUrl || linkLoading || !!signErr}
              onClick={() => void copyUrl()}
              className="touch-manipulation rounded-xl border border-[var(--border-muted-strong)] bg-[var(--surface-elevated)] px-3.5 py-2.5 text-[13px] font-medium text-stone-800 shadow-sm hover:bg-[var(--surface-muted)] disabled:pointer-events-none disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 active:scale-[0.99] motion-reduce:active:scale-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 max-sm:min-h-11"
            >
              {copied ? "Copied" : "Copy HTTPS feed"}
            </button>
            {publicGoogleCal?.calendarId ?
              <button
                type="button"
                onClick={() => void copyPublicCalendarId()}
                className="touch-manipulation rounded-xl border border-[var(--border-muted-strong)] bg-[var(--surface-elevated)] px-3.5 py-2.5 text-[13px] font-medium text-stone-800 shadow-sm hover:bg-[var(--surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 active:scale-[0.99] motion-reduce:active:scale-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 max-sm:min-h-11"
              >
                {copiedCalId ? "Copied calendar ID" : "Copy calendar ID"}
              </button>
            : null}
          </div>

          <p className="font-mono text-[11px] leading-relaxed text-[var(--text-secondary)] dark:text-zinc-500">
            {feedUrl ?
              <span className="break-all">{feedUrl}</span>
            : signErr ?
              "Personal feed unavailable — fix errors above."
            : linkLoading ?
              "Signing your personal feed…"
            : "—"}
          </p>

          <GoogleCanonicalSteps
            googleImportHelp={urls.googleImportHelp}
            googleSubscribeHelp={urls.googleSubscribeHelp}
          />

          {!googleReady ?
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
              <Link
                href={urls.googleImportHelp}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-secondary)] underline-offset-4 hover:text-stone-900 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                Google: Import
              </Link>
              <Link
                href={urls.googleSubscribeHelp}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-secondary)] underline-offset-4 hover:text-stone-900 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                Google: Subscribe URL
              </Link>
              <Link
                href={urls.appleSubscribedCalendarHelp}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-secondary)] underline-offset-4 hover:text-stone-900 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                Apple: Subscribed calendars
              </Link>
              <Link
                href={urls.googleWebAddByUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-secondary)] underline-offset-4 hover:text-stone-900 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                Gmail: Web add-by-URL
              </Link>
            </div>
          : null}

          <details className="group rounded-xl border border-[var(--border-muted)] bg-[var(--surface-elevated)] motion-reduce:transition-none dark:border-zinc-800 dark:bg-zinc-950">
            <summary className="cursor-pointer select-none list-none px-3 py-3 text-xs font-medium text-stone-700 marker:content-none hover:text-stone-950 focus-visible:rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none dark:text-zinc-400 dark:hover:text-zinc-200 [&::-webkit-details-marker]:hidden">
              Phones &amp; extra tips
              <span className="mt-1 block font-normal text-[11px] text-[var(--text-secondary)] group-open:hidden motion-reduce:transition-none dark:text-zinc-500">
                Quirky mobile Gmail, Gmail settings links
              </span>
            </summary>
            <div className="space-y-4 border-t border-[var(--border-muted)] px-3 py-4 text-[12px] text-stone-700 dark:border-zinc-800 dark:text-zinc-400">
              <GoogleCompactHelp
                googleWebImportExport={urls.googleWebImportExport}
                googleReady={googleReady}
                scrollToEasiestGoogle={scrollToEasiestGoogle}
              />
            </div>
          </details>

          <p className="text-[11px] leading-snug text-[var(--text-secondary)] motion-reduce:transition-none dark:text-zinc-600">
            Stream coverage varies by country — verify before lights&nbsp;out.
          </p>
        </div>
      : null}
    </div>
  );
}
