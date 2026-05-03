"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import { CATEGORIES, CategoryIcon } from "@/components/CategoryIcon";
import type { UiCategory as Cat } from "@/components/CategoryIcon";

const SHORT_LABELS: Record<Cat, string> = {
  FORMULA: "Formula",
  SPORTSCAR: "Sportscar",
  STOCK_CAR: "Stock",
  MOTORCYCLE: "Moto",
  RALLY: "Rally",
  OTHER: "Other",
};

export function HomeClient() {
  const searchParams = useSearchParams();
  const [picked, setPicked] = useState<Set<Cat>>(new Set());
  const [freeOnly, setFreeOnly] = useState(true);
  const [token, setToken] = useState<string>("");
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [signErr, setSignErr] = useState<string>("");
  const [googleReady, setGoogleReady] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string>("");
  const [syncBusy, setSyncBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [linkLoading, setLinkLoading] = useState(true);
  const [dbTotals, setDbTotals] = useState<{
    sessionRows: number;
    upcomingRows: number;
  } | null>(null);
  const [publicGoogleCal, setPublicGoogleCal] = useState<{
    credentialsConfigured: boolean;
    calendarId: string | null;
    subscribeHref: string | null;
  } | null>(null);
  const [copiedCalId, setCopiedCalId] = useState(false);
  const [otherOptionsOpen, setOtherOptionsOpen] = useState(false);

  const toggle = useCallback((c: Cat) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }, []);

  useEffect(() => {
    let stale = false;
    const run = async () => {
      await Promise.resolve();
      if (stale) return;
      setLinkLoading(true);
      setSignErr("");
      try {
        const res = await fetch("/api/calendar/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categories: Array.from(picked),
            freeOnly,
          }),
        });
        const data = await res.json();
        if (stale) return;
        if (!res.ok) {
          setToken("");
          setSessionCount(null);
          setDbTotals(null);
          setSignErr(typeof data?.error === "string" ? data.error : "Sign failed");
          return;
        }
        setSignErr("");
        setToken(typeof data.token === "string" ? data.token : "");
        setSessionCount(
          typeof data.sessionCount === "number" ? data.sessionCount : null,
        );
        setDbTotals(
          typeof data.dbSessionTotal === "number" &&
            typeof data.dbUpcomingTotal === "number" ?
            {
              sessionRows: data.dbSessionTotal,
              upcomingRows: data.dbUpcomingTotal,
            }
          : null,
        );
      } catch {
        if (stale) return;
        setToken("");
        setSessionCount(null);
        setDbTotals(null);
        setSignErr("Network error — check your connection and try again.");
      } finally {
        if (!stale) setLinkLoading(false);
      }
    };
    void run();
    return () => {
      stale = true;
    };
  }, [picked, freeOnly]);

  useEffect(() => {
    fetch("/api/auth/status", { credentials: "same-origin" })
      .then((r) => r.json())
      .then(
        (j: {
          googleConfigured?: boolean;
          signedIn?: boolean;
          email?: string | null;
          googleServiceCalendar?: {
            credentialsConfigured?: boolean;
            calendarId?: string | null;
            subscribeHref?: string | null;
          };
        }) => {
          setGoogleReady(!!j.googleConfigured);
          if (j.signedIn && j.email) setSessionEmail(j.email);
          const g = j.googleServiceCalendar;
          if (g && typeof g.credentialsConfigured === "boolean") {
            setPublicGoogleCal({
              credentialsConfigured: g.credentialsConfigured,
              calendarId:
                typeof g.calendarId === "string" && g.calendarId ? g.calendarId : null,
              subscribeHref:
                typeof g.subscribeHref === "string" && g.subscribeHref ?
                  g.subscribeHref
                : null,
            });
          } else {
            setPublicGoogleCal(null);
          }
        },
      )
      .catch(() => {});
  }, []);

  const copyPublicCalendarId = async () => {
    const id = publicGoogleCal?.calendarId;
    if (!id) return;
    await navigator.clipboard.writeText(id);
    setCopiedCalId(true);
    window.setTimeout(() => setCopiedCalId(false), 2200);
  };

  useEffect(() => {
    const o = searchParams?.get("oauth");
    const errors: Record<string, string> = {
      denied: "Sign-in cancelled.",
      missing_config: "Google OAuth env vars missing on server.",
      invalid: "Incomplete OAuth callback.",
      token_error: "Token exchange failed.",
      no_user: "No Google profile.",
      no_refresh_token:
        "No refresh token — revoke app access in Google once, reconnect with consent.",
    };

    if (!o) return;

    const wipeQuery = () => {
      window.history.replaceState(null, "", "/");
    };

    const fail = async (msg: string) => {
      alert(msg);
      wipeQuery();
      await fetch("/api/auth/status", { credentials: "same-origin" }).catch(() => {});
    };

    if (o === "no_refresh_token") {
      void fail(errors.no_refresh_token);
      return;
    }
    if (o !== "ok" && errors[o]) {
      void fail(errors[o]);
      return;
    }
    if (o !== "ok") return;

    void fetch("/api/auth/status", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((j: { email?: string | null }) => setSessionEmail(j.email ?? null))
      .catch(() => undefined);

    const pending = window.sessionStorage.getItem("racercalendar.pendingFeedToken");

    async function syncAfterOAuth() {
      setSyncBusy(true);
      try {
        if (!pending) {
          setSyncMsg("Signed in — tap Push below.");
          wipeQuery();
          return;
        }
        const res = await fetch("/api/calendar/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ feedToken: pending }),
        });
        const json = await res.json();
        if (!res.ok) {
          setSyncMsg(
            typeof json?.error === "string" ? json.error : "Sync failed.",
          );
          wipeQuery();
          return;
        }
        window.sessionStorage.removeItem("racercalendar.pendingFeedToken");
        const n = typeof json.sessions === "number" ? json.sessions : 0;
        setSyncMsg(
          `Synced ${json.inserted as number} races (${n} sessions) — look for “RacerCalendar”.`,
        );
        wipeQuery();
      } catch {
        setSyncMsg("Sync failed (network).");
        wipeQuery();
      } finally {
        setSyncBusy(false);
      }
    }

    void syncAfterOAuth();
  }, [searchParams]);

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_ORIGIN ?? "");

  const feedUrl =
    token && origin ? `${origin}/api/calendar/feed/${encodeURIComponent(token)}` : "";

  const googleSubscribeHelp =
    "https://support.google.com/calendar/answer/37100?hl=en";
  const googleImportHelp =
    "https://support.google.com/calendar/answer/37118?hl=en&co=GENIE.Platform%3DDesktop";
  /** Web-only settings; the Google Calendar mobile app usually cannot do URL subscribe or file import. */
  const googleWebAddByUrl =
    "https://calendar.google.com/calendar/r/settings/addbyurl";
  const googleWebImportExport =
    "https://calendar.google.com/calendar/r/settings/export";
  const appleSubscribedCalendarHelp =
    "https://support.apple.com/guide/iphone/use-multiple-calendars-iph8677073cfd/ios";

  const webcalFeedUrl = useMemo(
    () => (feedUrl ? feedUrl.replace(/^https:\/\//i, "webcal://") : ""),
    [feedUrl],
  );

  const connectHref = useMemo(() => {
    if (!token) return "";
    return `/api/auth/google?feedToken=${encodeURIComponent(token)}`;
  }, [token]);

  const copyUrl = async () => {
    if (!feedUrl) return;
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  const downloadIcsFile = async () => {
    if (!feedUrl) return;
    setDownloadBusy(true);
    try {
      const res = await fetch(feedUrl);
      if (!res.ok) return;
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = "racercalendar.ics";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } finally {
      setDownloadBusy(false);
    }
  };

  const startGoogleOAuth = () => {
    if (!token) return;
    window.sessionStorage.setItem("racercalendar.pendingFeedToken", token);
    window.location.href = connectHref;
  };

  const pushSyncManual = async () => {
    if (!token) return;
    setSyncBusy(true);
    try {
      const res = await fetch("/api/calendar/sync", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedToken: token }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSyncMsg(typeof json?.error === "string" ? json.error : "Push failed.");
        return;
      }
      const n = typeof json.sessions === "number" ? json.sessions : 0;
      setSyncMsg(`Synced ${json.inserted} races (${n} sessions).`);
    } catch {
      setSyncMsg("Push failed.");
    } finally {
      setSyncBusy(false);
    }
  };

  const allSports = picked.size === 0;

  const googleHeroSidecar =
    !!publicGoogleCal?.subscribeHref || !!publicGoogleCal?.credentialsConfigured;

  const countBanner =
    sessionCount === null ? null : sessionCount === 0 ?
      dbTotals?.sessionRows === 0 ?
        <div className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50/40 px-4 py-3 text-sm text-rose-900 shadow-sm dark:border-rose-500/35 dark:bg-rose-950/40 dark:from-transparent dark:to-transparent dark:text-rose-100 dark:shadow-none">
          <p className="font-medium text-stone-900 dark:text-white">Race data hasn’t been loaded.</p>
          <p className="mt-2 text-xs leading-relaxed text-rose-800/95 dark:text-rose-100/95">
            Migrations ran, but nobody ran the <strong>seed</strong> yet, so there are
            zero sessions in the database. Whoever maintains this site needs to run
            once against production (with the production{" "}
            <code className="rounded bg-rose-200/55 px-1 py-px text-[11px] dark:bg-black/30">
              DATABASE_URL
            </code>
            ):{" "}
            <code className="rounded bg-rose-200/55 px-1 py-px text-[11px] whitespace-pre-wrap dark:bg-black/30">
              npx prisma db seed
            </code>
            {" "}
            then refresh this page. Until then, Calendar will stay empty no matter how
            you set filters.
          </p>
        </div>
      : dbTotals && dbTotals.upcomingRows === 0 && dbTotals.sessionRows > 0 ?
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/30 px-4 py-3 text-sm text-amber-950 shadow-sm dark:border-amber-500/35 dark:bg-amber-500/10 dark:from-transparent dark:to-transparent dark:text-amber-100 dark:shadow-none">
          <p className="font-medium text-amber-900 dark:text-amber-50">
            Stored races exist, but they’re all in the past.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-amber-900/95 dark:text-amber-100/95">
            Re-run seed to generate future weekends, or add new schedules in the
            database.
          </p>
        </div>
      : dbTotals && dbTotals.upcomingRows > 0 ?
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/30 px-4 py-3 text-sm text-amber-950 shadow-sm dark:border-amber-500/35 dark:bg-amber-500/10 dark:from-transparent dark:to-transparent dark:text-amber-100 dark:shadow-none">
          <p className="font-medium text-amber-900 dark:text-amber-50">Nothing matches these filters.</p>
          <p className="mt-2 text-xs leading-relaxed text-amber-950/95 dark:text-amber-200/90">
            There are upcoming races in the database, but none match what you chose.
            Try turning on <strong>Only free streams</strong>, pick different series,
            or clear series so “Everything” applies.
          </p>
        </div>
      : <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/30 px-4 py-3 text-sm text-amber-950 shadow-sm dark:border-amber-500/35 dark:bg-amber-500/10 dark:from-transparent dark:to-transparent dark:text-amber-100 dark:shadow-none">
          <p className="font-medium text-amber-900 dark:text-amber-50">Nothing matches yet.</p>
          <p className="mt-2 text-xs leading-relaxed text-amber-950/95 dark:text-amber-200/90">
            Try relaxing filters first. If the calendar is still empty, your host may
            need to seed race data (
            <code className="rounded bg-amber-200/65 px-1 py-px text-[11px] dark:bg-black/25">
              npx prisma db seed
            </code>
            ).
          </p>
        </div>
    : <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/35 px-4 py-2.5 text-sm text-emerald-950 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-950/35 dark:from-transparent dark:to-transparent dark:text-emerald-100 dark:shadow-none">
        <strong className="text-emerald-800 dark:text-emerald-50">{sessionCount}</strong>
        {" "}
        {sessionCount === 1 ? "race session" : "race sessions"}
        {" "}
        in this feed — on Google Calendar,{" "}
        <strong className="text-emerald-800 dark:text-emerald-50">Import</strong>{" "}
        usually shows events right away;{" "}
        <strong className="text-emerald-800 dark:text-emerald-50">From URL</strong>{" "}
        subscriptions can lag and search often doesn’t find them immediately.
      </div>;

  const googleSteps = (
    <div className="mt-4 space-y-5 text-[13px] leading-snug text-stone-700 dark:text-zinc-300 lg:text-sm">
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/95 to-teal-50/50 px-3 py-3 shadow-sm dark:border-emerald-500/25 dark:from-transparent dark:to-transparent dark:bg-emerald-950/30 dark:shadow-none">
        <p className="font-semibold text-emerald-900 dark:text-emerald-50">Recommended: import once</p>
        <p className="mt-2 text-[12px] leading-relaxed lg:text-[13px] text-emerald-900/92 dark:text-emerald-100/95">
          Often the fastest way to see races in Google Calendar. You can subscribe by URL later if you prefer.
        </p>
        <ol className="mt-3 list-none space-y-2.5">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white shadow-sm dark:bg-emerald-800/70">
              A
            </span>
            <span className="pt-px">
              In <strong className="text-emerald-800 dark:text-emerald-50">Other options</strong> tap{" "}
              <strong className="text-emerald-800 dark:text-emerald-50">Download .ics</strong> (
              same data as <strong className="text-emerald-800 dark:text-emerald-50">Copy HTTPS feed</strong>
              ).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white shadow-sm dark:bg-emerald-800/70">
              B
            </span>
            <span className="pt-px flex flex-wrap items-center gap-x-2 gap-y-1">
              Open{" "}
              <Link
                href="https://calendar.google.com/"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-orange-600 underline underline-offset-2 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
              >
                calendar.google.com
              </Link>{" "}
              → <strong className="text-stone-900 dark:text-white">Settings</strong> (gear) →{" "}
              <strong className="text-stone-900 dark:text-white">Import &amp; Export</strong> →{" "}
              <strong className="text-stone-900 dark:text-white">Import</strong> and pick the file.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white shadow-sm dark:bg-emerald-800/70">
              C
            </span>
            <span className="pt-px">
              See Google’s{" "}
              <Link
                href={googleImportHelp}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-orange-600 underline underline-offset-2 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
              >
                import events
              </Link>{" "}
              article if the menu doesn’t match.
            </span>
          </li>
        </ol>
      </div>

      <div>
        <p className="font-semibold text-stone-800 dark:text-zinc-200">
          Optional: subscribe by URL (auto-refresh)
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-stone-600 lg:text-[13px] dark:text-zinc-400">
          Google may take a long time to fetch the first update, and calendar search often won’t find those events until they appear.
        </p>
        <ol className="mt-3 list-none space-y-3">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-700 text-xs font-semibold text-white shadow-sm dark:bg-zinc-700">
              1
            </span>
            <span className="pt-px">
              In <strong className="text-stone-900 dark:text-white">Other options</strong> tap{" "}
              <strong className="text-stone-900 dark:text-white">Copy HTTPS feed</strong>, then paste
              in Google Calendar.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-700 text-xs font-semibold text-white shadow-sm dark:bg-zinc-700">
              2
            </span>
            <span className="pt-px">
              In Google Calendar, beside{" "}
              <strong className="text-stone-900 dark:text-white">Other calendars</strong>, click{" "}
              <strong className="text-stone-900 dark:text-white">+</strong> →{" "}
              <strong className="text-stone-900 dark:text-white">From URL</strong> and paste.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-700 text-xs font-semibold text-white shadow-sm dark:bg-zinc-700">
              3
            </span>
            <span className="pt-px">
              Wait — first sync can be slow. See Google’s{" "}
              <Link
                href={googleSubscribeHelp}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-orange-600 underline underline-offset-2 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
              >
                subscribe from URL
              </Link>{" "}
              help.
            </span>
          </li>
        </ol>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-10 sm:px-6 lg:pb-32 lg:pt-14 xl:px-10">
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-14 lg:gap-y-12">
        {/* Hero + filters column — appears after calendar sidebar on phones so signup / ICS come first */}
        <div className="order-2 flex flex-col gap-8 lg:order-1 lg:col-span-6 xl:col-span-7 lg:gap-10">
          <header className="space-y-3 lg:space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600 dark:text-orange-400">
              RacerCalendar
            </p>
            <h1 className="max-w-xl text-pretty text-4xl font-semibold tracking-tight bg-gradient-to-r from-orange-900 via-orange-950 to-violet-900 bg-clip-text text-transparent sm:text-[2.65rem] sm:leading-[1.1] lg:max-w-2xl lg:text-5xl xl:text-[3.25rem] xl:leading-[1.08] dark:from-orange-100 dark:via-white dark:to-violet-200">
              Racing you can watch, straight in Google Calendar
            </h1>
            <p className="max-w-xl text-pretty text-sm leading-relaxed text-stone-600 lg:text-[15px] lg:leading-relaxed dark:text-zinc-400">
              Pick what you care about once. Prefer{" "}
              <strong className="font-medium text-stone-800 dark:text-zinc-200">Add to Calendar</strong>{" "}
              if this site supports it — otherwise follow the quick steps — no guessing
              which Google menu you need.
            </p>
          </header>

          <section className="flex flex-col gap-4 lg:gap-5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 lg:justify-between lg:gap-4">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-xs font-medium uppercase tracking-wide text-stone-600 dark:text-zinc-500">
                  Series
                </span>
                {allSports ?
                  <span className="text-xs text-stone-500 dark:text-zinc-500">Everything</span>
                : null}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap lg:gap-3">
              {CATEGORIES.map((c) => {
                const on = picked.has(c);
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={on}
                    title={SHORT_LABELS[c]}
                    onClick={() => toggle(c)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border px-3 py-3 transition sm:flex-1 sm:basis-[calc(16.66%-12px)] sm:min-w-[5.75rem] sm:py-4 ${
                      on
                        ? "border-orange-500/90 bg-gradient-to-br from-orange-400/95 to-orange-600/98 text-orange-950 shadow-lg shadow-orange-600/35 ring-2 ring-orange-400/85 dark:border-orange-400/85 dark:bg-gradient-to-br dark:from-orange-600/85 dark:to-orange-950/92 dark:text-orange-50 dark:ring-orange-600/85"
                        : "border-stone-200/90 bg-white/72 text-stone-600 shadow-inner shadow-orange-950/10 hover:border-orange-300/95 hover:bg-white/95 hover:text-stone-900 lg:border lg:border-transparent dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400 dark:shadow-inner dark:shadow-transparent dark:hover:border-orange-950/97 dark:hover:text-zinc-200"
                    }`}
                  >
                    <CategoryIcon category={c} />
                    <span className="text-center text-[11px] font-medium leading-tight sm:text-xs">
                      {SHORT_LABELS[c]}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={freeOnly}
              title="Sessions need at least one free stream in our data."
              onClick={() => setFreeOnly(!freeOnly)}
              className="flex items-center justify-between gap-6 rounded-2xl border border-stone-200/90 bg-white/92 px-5 py-3.5 text-left shadow-sm shadow-orange-950/15 transition hover:border-orange-400/58 hover:bg-white lg:max-w-md dark:border-zinc-800 dark:bg-gradient-to-br dark:from-zinc-950 dark:to-zinc-900 dark:shadow-none dark:hover:border-zinc-600"
            >
              <div>
                <p className="text-sm font-medium text-stone-900 dark:text-zinc-100">
                  Only show free streams
                </p>
                <p className="mt-0.5 text-[11px] text-stone-600 dark:text-zinc-500">
                  Hides races we only know as paid-only.
                </p>
              </div>
              <span
                className={`relative inline-flex h-[26px] w-[46px] shrink-0 rounded-full transition ${
                  freeOnly ? "bg-orange-600" : "bg-zinc-600"
                }`}
              >
                <span
                  className={`absolute top-[3px] size-5 rounded-full bg-white shadow transition-all ${
                    freeOnly ? "left-[21px]" : "left-[3px]"
                  }`}
                />
              </span>
            </button>

            {signErr ?
              <p className="rounded-xl border border-red-200 bg-red-50/95 px-4 py-3 text-xs text-red-950 dark:border-red-500/35 dark:bg-red-500/15 dark:text-red-50">
                {signErr}
              </p>
            : null}

            {countBanner}
          </section>
        </div>

        {/* Calendar actions — unified hero + collapsible extras */}
        <aside className="order-1 flex flex-col gap-5 lg:order-2 lg:col-span-6 xl:col-span-5 lg:sticky lg:top-[5.25rem]">
          <div
            id="subscribe-by-url"
            className="overflow-hidden rounded-3xl border-2 border-stone-300/94 bg-white/93 p-5 shadow-xl shadow-orange-950/21 backdrop-blur-sm dark:border-zinc-600/93 dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-950 dark:to-black dark:shadow-black/71 lg:p-8"
          >
            <header className="space-y-1.5">
              <h2 className="text-lg font-semibold tracking-tight text-stone-900 sm:text-xl dark:text-white">
                Get races on your calendar
              </h2>
              <p className="text-xs leading-relaxed text-stone-600 sm:text-[13px] dark:text-zinc-500">
                One shared Google calendar for everyone, or a personal link that follows your
                filters below.
              </p>
            </header>

            <div
              className={`mt-6 grid gap-3 ${googleHeroSidecar ? "sm:grid-cols-2" : ""}`}
            >
              {publicGoogleCal?.subscribeHref ?
                <a
                  href={publicGoogleCal.subscribeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 px-5 py-3.5 text-center text-[15px] font-semibold text-white shadow-lg shadow-violet-950/50 ring-1 ring-white/10 transition hover:from-violet-400 hover:to-violet-500 hover:shadow-violet-900/55"
                >
                  <span className="drop-shadow-sm">Add to Google Calendar</span>
                </a>
              : publicGoogleCal?.credentialsConfigured ?
                <div className="flex min-h-[3.25rem] flex-col justify-center rounded-2xl border border-dashed border-violet-300/93 bg-gradient-to-br from-violet-50 via-white to-indigo-50/65 px-4 py-3 text-center shadow-sm shadow-violet-950/10 dark:border-violet-500/35 dark:bg-violet-950/25 dark:from-transparent dark:via-transparent dark:to-transparent dark:shadow-none">
                  <span className="text-sm font-semibold text-violet-900 dark:text-violet-200">
                    Add to Google Calendar
                  </span>
                  <span className="mt-1 text-[11px] text-violet-800/93 dark:text-violet-300/85">
                    First sync pending — host runs service-sync once.
                  </span>
                </div>
              : null}

              {webcalFeedUrl && !linkLoading && !signErr ?
                <a
                  href={webcalFeedUrl}
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-5 py-3.5 text-center text-[15px] font-semibold text-white shadow-lg shadow-emerald-950/45 ring-1 ring-white/10 transition hover:from-emerald-400 hover:to-emerald-500 sm:col-span-1"
                >
                  <span>Add to Calendar</span>
                </a>
              : <span
                  className={`inline-flex min-h-[3.25rem] items-center justify-center rounded-2xl border border-stone-300 bg-stone-200/90 px-5 py-3.5 text-center text-[15px] font-semibold text-stone-500 shadow-inner shadow-white/80 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-500 dark:shadow-none ${
                    signErr ? "opacity-35" : linkLoading ? "opacity-55" : "opacity-40"
                  }`}
                  aria-disabled="true"
                >
                  Add to Calendar
                </span>
              }
            </div>

            <p className="mt-4 text-center text-[11px] leading-snug text-stone-600 dark:text-zinc-500 sm:text-left">
              <strong className="font-medium text-stone-800 dark:text-zinc-400">Google:</strong> same full schedule for
              all subscribers.&nbsp;
              <strong className="font-medium text-stone-800 dark:text-zinc-400">Calendar app:</strong> respects your
              series + free‑stream filters (
              <span className="text-stone-600 dark:text-zinc-500">{linkLoading ? "loading…" : "Webcal subscription"}</span>
              ).
            </p>

            <button
              type="button"
              aria-expanded={otherOptionsOpen}
              onClick={() => setOtherOptionsOpen((o) => !o)}
              className="mt-7 flex w-full items-center justify-between gap-3 rounded-2xl border border-stone-300/95 bg-gradient-to-r from-white/96 to-orange-50/97 px-4 py-3.5 text-left shadow-sm shadow-orange-950/25 transition hover:border-orange-400/97 hover:from-white hover:to-orange-50/99 dark:border-zinc-700 dark:from-zinc-950/96 dark:to-black/94 dark:shadow-none dark:hover:border-zinc-600"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <ChevronDown
                  className={`size-5 shrink-0 text-orange-600 transition-transform duration-300 dark:text-orange-400 ${otherOptionsOpen ? "-rotate-180" : ""}`}
                  strokeWidth={2.25}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-stone-900 dark:text-zinc-100">
                    Other options
                  </span>
                  <span className="mt-0.5 block text-[11px] font-normal text-stone-600 dark:text-zinc-500">
                    Download, copy links, calendar ID, device help
                  </span>
                </span>
              </span>
            </button>

            {otherOptionsOpen ?
              <div className="mt-3 space-y-4 rounded-2xl border border-stone-200/97 bg-gradient-to-b from-white/98 to-stone-50/98 p-4 shadow-inner shadow-orange-950/18 dark:border-zinc-800 dark:from-zinc-950/97 dark:to-black/98 dark:shadow-none">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!feedUrl || linkLoading || !!signErr || downloadBusy}
                    onClick={() => void downloadIcsFile()}
                    className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-800 shadow-sm hover:bg-stone-50 disabled:pointer-events-none disabled:opacity-35 sm:text-[13px] dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {downloadBusy ? "Downloading…" : "Download .ics"}
                  </button>
                  <button
                    type="button"
                    disabled={!feedUrl || linkLoading || !!signErr}
                    onClick={() => void copyUrl()}
                    className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-800 shadow-sm hover:bg-stone-50 disabled:pointer-events-none disabled:opacity-35 sm:text-[13px] dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {copied ? "Copied" : "Copy HTTPS feed"}
                  </button>
                  {publicGoogleCal?.calendarId ?
                    <button
                      type="button"
                      onClick={() => void copyPublicCalendarId()}
                      className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-800 shadow-sm hover:bg-stone-50 sm:text-[13px] dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                      {copiedCalId ? "Copied calendar ID" : "Copy calendar ID"}
                    </button>
                  : null}
                </div>

                <p className="font-mono text-[10px] leading-relaxed text-stone-600 sm:text-[11px] dark:text-zinc-500">
                  {feedUrl ?
                    <span className="break-all">{feedUrl}</span>
                  : signErr ?
                    "Personal feed unavailable — fix error above."
                  : linkLoading ?
                    "Personal feed signing…"
                  : "—"}
                </p>

                {!googleReady ?
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                    <Link
                      href={googleImportHelp}
                      target="_blank"
                      rel="noreferrer"
                      className="text-stone-600 underline-offset-4 hover:text-stone-900 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300"
                    >
                      Google: Import
                    </Link>
                    <Link
                      href={googleSubscribeHelp}
                      target="_blank"
                      rel="noreferrer"
                      className="text-stone-600 underline-offset-4 hover:text-stone-900 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300"
                    >
                      Google: Subscribe URL
                    </Link>
                    <Link
                      href={appleSubscribedCalendarHelp}
                      target="_blank"
                      rel="noreferrer"
                      className="text-stone-600 underline-offset-4 hover:text-stone-900 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300"
                    >
                      Apple: Subscribed calendars
                    </Link>
                    <Link
                      href={googleWebAddByUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-stone-600 underline-offset-4 hover:text-stone-900 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300"
                    >
                      Gmail: Web add-by-URL
                    </Link>
                  </div>
                : null}

                <details className="group rounded-xl border border-stone-200 bg-white/98 dark:border-zinc-800 dark:bg-zinc-950/98">
                  <summary className="cursor-pointer select-none list-none px-3 py-3 text-xs font-medium text-stone-700 marker:content-none hover:text-stone-950 dark:text-zinc-400 dark:hover:text-zinc-200 [&::-webkit-details-marker]:hidden">
                    More help · mobile Gmail · Apple · steps
                    <span className="mt-1 block font-normal text-[11px] text-stone-600 group-open:hidden dark:text-zinc-500">
                      Tap if Webcal/Google didn&apos;t cooperate.
                    </span>
                  </summary>
                  <div className="space-y-4 border-t border-stone-200 px-3 py-4 text-[12px] text-stone-700 dark:border-zinc-800 dark:text-zinc-400">
                    <div className="rounded-lg border border-sky-200 bg-gradient-to-br from-sky-50 to-indigo-50/45 px-3 py-3 leading-relaxed dark:border-sky-500/25 dark:from-sky-950/40 dark:to-indigo-950/22">
                      <p className="font-medium text-sky-900 dark:text-sky-100">
                        Phones &amp; Google&apos;s cramped UI?
                      </p>
                      <p className="mt-2 text-sky-900/94 dark:text-sky-100/88">
                        <strong className="text-stone-950 dark:text-white">Add to Calendar</strong> opens your app;{" "}
                        <strong className="text-stone-950 dark:text-white">Download .ics</strong> from Files often works too.
                        {googleReady ?
                          <>
                            {" "}
                            <button
                              type="button"
                              className="-mx-px font-medium text-orange-600 underline decoration-orange-400/40 underline-offset-2 hover:text-orange-800 dark:text-orange-300 dark:hover:text-orange-200"
                              onClick={() =>
                                document
                                  .getElementById("easiest-google")
                                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
                              }
                            >
                              Connect Google
                            </button>{" "}
                            writes into your Gmail calendar from our server (
                            <button
                              type="button"
                              className="-mx-px font-medium text-orange-600 underline decoration-orange-400/40 underline-offset-2 hover:text-orange-800 dark:text-orange-300 dark:hover:text-orange-200"
                              onClick={() =>
                                document
                                  .getElementById("easiest-google")
                                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
                              }
                            >
                              below
                            </button>
                            ).
                          </>
                        : null}{" "}
                        <Link
                          href={googleWebImportExport}
                          target="_blank"
                          rel="noreferrer"
                          className="text-orange-600 underline underline-offset-2 hover:text-orange-800 dark:text-orange-300 dark:hover:text-orange-200"
                        >
                          Gmail import &amp; export
                        </Link>
                        {" · "}
                        <Link
                          href="https://formulacalendar.com/subscribe/"
                          target="_blank"
                          rel="noreferrer"
                          className="text-orange-600 underline underline-offset-2 hover:text-orange-800 dark:text-orange-300 dark:hover:text-orange-200"
                        >
                          Formula&nbsp;Calendar
                        </Link>
                        .
                      </p>
                    </div>
                    {googleSteps}
                  </div>
                </details>

                <p className="text-[11px] leading-snug text-stone-600 dark:text-zinc-600">
                  Stream coverage varies by country — verify before lights&nbsp;out.
                </p>
              </div>
            : null}
          </div>

          {googleReady ?
            <div
              id="easiest-google"
              className="overflow-hidden rounded-2xl border border-orange-400/55 bg-gradient-to-br from-orange-50/96 via-white to-amber-50/94 p-5 shadow-[0_22px_50px_-32px_rgba(234,88,12,0.55)] ring-1 ring-orange-950/10 dark:border-orange-500/40 dark:bg-gradient-to-br dark:from-orange-950/85 dark:via-zinc-950 dark:to-zinc-950 dark:shadow-[0_0_32px_-12px_rgba(234,88,12,0.4)] dark:ring-0"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-orange-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm dark:bg-orange-500 dark:text-orange-950 dark:shadow-none">
                  Optional
                </span>
                <h2 className="text-[15px] font-semibold text-stone-900 dark:text-white">
                  Signed-in Google Calendar
                </h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-stone-700 dark:text-orange-50/82">
                We create / refresh <strong className="text-stone-950 dark:text-white">RacerCalendar</strong> in{" "}
                <em>your</em> Gmail account (
                <strong className="text-stone-950 dark:text-white">respects filters</strong> via Push sync).
              </p>
              {sessionEmail ?
                <p className="mt-2 text-[11px] text-stone-600 dark:text-orange-100/90">{sessionEmail}</p>
              : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!connectHref}
                  onClick={startGoogleOAuth}
                  className="rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-900/35 transition hover:from-orange-500 hover:to-orange-400 disabled:pointer-events-none disabled:opacity-40 dark:from-orange-500 dark:to-orange-500 dark:text-orange-950 dark:hover:from-orange-400 dark:hover:to-orange-400 dark:shadow-orange-950/55"
                >
                  Connect Google
                </button>
                <button
                  type="button"
                  disabled={syncBusy || !token}
                  onClick={pushSyncManual}
                  className="rounded-xl border border-orange-600/35 bg-orange-600/10 px-3 py-2.5 text-sm font-medium text-stone-900 hover:bg-orange-600/14 disabled:pointer-events-none disabled:opacity-40 dark:border-orange-400/50 dark:bg-transparent dark:text-orange-50 dark:hover:bg-orange-500/12"
                >
                  {syncBusy ? "Syncing…" : "Push / refresh"}
                </button>
              </div>
              {syncMsg ?
                <p className="mt-3 text-[11px] text-stone-600 dark:text-orange-50/90">{syncMsg}</p>
              : null}
              <button
                type="button"
                className="mt-3 block text-[11px] font-medium text-stone-600/85 underline underline-offset-2 hover:text-stone-900 dark:text-orange-50/60 dark:hover:text-orange-50"
                onClick={() =>
                  document
                    .getElementById("subscribe-by-url")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                Prefer Webcal / public Google calendar above
              </button>
            </div>
          : null}
        </aside>
      </div>
    </div>
  );
}
