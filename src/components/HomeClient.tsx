"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

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

  const countBanner =
    sessionCount === null ? null : sessionCount === 0 ?
      dbTotals?.sessionRows === 0 ?
        <div className="rounded-xl border border-rose-500/35 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
          <p className="font-medium text-white">Race data hasn’t been loaded.</p>
          <p className="mt-2 text-xs leading-relaxed text-rose-100/95">
            Migrations ran, but nobody ran the <strong>seed</strong> yet, so there are
            zero sessions in the database. Whoever maintains this site needs to run
            once against production (with the production{" "}
            <code className="rounded bg-black/30 px-1 py-px text-[11px]">DATABASE_URL</code>
            ):{" "}
            <code className="rounded bg-black/30 px-1 py-px text-[11px] whitespace-pre-wrap">
              npx prisma db seed
            </code>
            {" "}
            then refresh this page. Until then, Calendar will stay empty no matter how
            you set filters.
          </p>
        </div>
      : dbTotals && dbTotals.upcomingRows === 0 && dbTotals.sessionRows > 0 ?
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-medium text-amber-50">
            Stored races exist, but they’re all in the past.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-amber-100/95">
            Re-run seed to generate future weekends, or add new schedules in the
            database.
          </p>
        </div>
      : dbTotals && dbTotals.upcomingRows > 0 ?
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-medium text-amber-50">Nothing matches these filters.</p>
          <p className="mt-2 text-xs leading-relaxed text-amber-200/90">
            There are upcoming races in the database, but none match what you chose.
            Try turning on <strong>Only free streams</strong>, pick different series,
            or clear series so “Everything” applies.
          </p>
        </div>
      : <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-medium text-amber-50">Nothing matches yet.</p>
          <p className="mt-2 text-xs leading-relaxed text-amber-200/90">
            Try relaxing filters first. If the calendar is still empty, your host may
            need to seed race data (
            <code className="rounded bg-black/25 px-1 py-px text-[11px]">
              npx prisma db seed
            </code>
            ).
          </p>
        </div>
    : <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/35 px-4 py-2.5 text-sm text-emerald-100">
        <strong className="text-emerald-50">{sessionCount}</strong>
        {" "}
        {sessionCount === 1 ? "race session" : "race sessions"}
        {" "}
        in this feed — on Google Calendar, <strong className="text-emerald-50">Import</strong>{" "}
        usually shows events right away; <strong className="text-emerald-50">From URL</strong>{" "}
        subscriptions can lag and search often doesn’t find them immediately.
      </div>;

  const googleSteps = (
    <div className="mt-4 space-y-5 text-[13px] leading-snug text-zinc-300 lg:text-sm">
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/30 px-3 py-3 text-emerald-100/95">
        <p className="font-semibold text-emerald-50">Recommended: import once</p>
        <p className="mt-2 text-[12px] leading-relaxed lg:text-[13px]">
          Often the fastest way to see races in Google Calendar. You can subscribe by URL later if you prefer.
        </p>
        <ol className="mt-3 list-none space-y-2.5">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-800/70 text-xs font-semibold text-white">
              A
            </span>
            <span className="pt-px">
              Tap <strong className="text-emerald-50">Download .ics file</strong> below (
              same data as <strong className="text-emerald-50">Copy HTTPS feed</strong>
              ).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-800/70 text-xs font-semibold text-white">
              B
            </span>
            <span className="pt-px flex flex-wrap items-center gap-x-2 gap-y-1">
              Open{" "}
              <Link
                href="https://calendar.google.com/"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-orange-400 underline underline-offset-2 hover:text-orange-300"
              >
                calendar.google.com
              </Link>{" "}
              → <strong className="text-white">Settings</strong> (gear) →{" "}
              <strong className="text-white">Import &amp; Export</strong> →{" "}
              <strong className="text-white">Import</strong> and pick the file.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-800/70 text-xs font-semibold text-white">
              C
            </span>
            <span className="pt-px">
              See Google’s{" "}
              <Link
                href={googleImportHelp}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-orange-400 underline underline-offset-2 hover:text-orange-300"
              >
                import events
              </Link>{" "}
              article if the menu doesn’t match.
            </span>
          </li>
        </ol>
      </div>

      <div>
        <p className="font-semibold text-zinc-200">Optional: subscribe by URL (auto-refresh)</p>
        <p className="mt-2 text-[12px] leading-relaxed text-zinc-400 lg:text-[13px]">
          Google may take a long time to fetch the first update, and calendar search often won’t find those events until they appear.
        </p>
        <ol className="mt-3 list-none space-y-3">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-semibold text-white">
              1
            </span>
            <span className="pt-px">
              Tap <strong className="text-white">Copy HTTPS feed</strong> below.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-semibold text-white">
              2
            </span>
            <span className="pt-px">
              In Google Calendar, beside <strong className="text-white">Other calendars</strong>, click{" "}
              <strong className="text-white">+</strong> →{" "}
              <strong className="text-white">From URL</strong> and paste.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-semibold text-white">
              3
            </span>
            <span className="pt-px">
              Wait — first sync can be slow. See Google’s{" "}
              <Link
                href={googleSubscribeHelp}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-orange-400 underline underline-offset-2 hover:text-orange-300"
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
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-400">
              RacerCalendar
            </p>
            <h1 className="max-w-xl text-pretty text-4xl font-semibold tracking-tight text-white sm:text-[2.65rem] sm:leading-[1.1] lg:max-w-2xl lg:text-5xl xl:text-[3.25rem] xl:leading-[1.08]">
              Racing you can watch, straight in Google Calendar
            </h1>
            <p className="max-w-xl text-pretty text-sm leading-relaxed text-zinc-400 lg:text-[15px] lg:leading-relaxed">
              Pick what you care about once. Prefer{" "}
              <strong className="font-medium text-zinc-300">Add to Calendar</strong>{" "}
              if this site supports it — otherwise follow the quick steps — no guessing
              which Google menu you need.
            </p>
          </header>

          <section className="flex flex-col gap-4 lg:gap-5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 lg:justify-between lg:gap-4">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Series
                </span>
                {allSports ?
                  <span className="text-xs text-zinc-500">Everything</span>
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
                        ? "border-orange-500/70 bg-orange-600/20 text-orange-50 ring-2 ring-orange-500/35"
                        : "border-zinc-800 bg-zinc-900/55 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 lg:border-zinc-800/90"
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
              className="flex items-center justify-between gap-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-5 py-3.5 text-left transition hover:border-zinc-600 lg:max-w-md"
            >
              <div>
                <p className="text-sm font-medium text-zinc-100">
                  Only show free streams
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
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
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                {signErr}
              </p>
            : null}

            {countBanner}
          </section>
        </div>

        {/* Calendar actions column — sticky on desktop; listed first on mobile */}
        <aside className="order-1 flex flex-col gap-5 lg:order-2 lg:col-span-6 xl:col-span-5 lg:sticky lg:top-[5.25rem]">
          {googleReady ?
            <div
              id="easiest-google"
              className="overflow-hidden rounded-2xl border-2 border-orange-500/50 bg-gradient-to-br from-orange-950/85 via-zinc-950 to-zinc-950 p-6 shadow-[0_0_40px_-12px_rgba(234,88,12,0.45)]"
            >
              <div className="flex items-start gap-2">
                <span className="rounded-md bg-orange-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-950">
                  Easiest
                </span>
              </div>
              <h2 className="mt-3 font-semibold tracking-tight text-white text-xl">
                Add races with Google
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-orange-50/85">
                We create a calendar called <strong>RacerCalendar</strong> in your
                account — no digging through URLs and menus.
              </p>
              <p className="mt-2 text-[11px] leading-snug text-orange-50/68">
                This is how a lot of event apps dodge Google’s cramped ICS menus: the server
                updates your calendar for you instead of handing you brittle web flows.
              </p>
              {sessionEmail ?
                <p className="mt-3 text-xs text-orange-100/95">{sessionEmail}</p>
              : null}

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!connectHref}
                  onClick={startGoogleOAuth}
                  className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-orange-950 shadow-lg shadow-orange-900/45 transition hover:bg-orange-400 disabled:pointer-events-none disabled:opacity-40"
                >
                  Connect Google
                </button>
                <button
                  type="button"
                  disabled={syncBusy || !token}
                  onClick={pushSyncManual}
                  className="rounded-xl border border-orange-400/55 bg-transparent px-4 py-2.5 text-sm font-medium text-orange-50 hover:bg-orange-500/15 disabled:pointer-events-none disabled:opacity-40"
                >
                  {syncBusy ? "Syncing…" : "Push / refresh races"}
                </button>
              </div>
              {syncMsg ?
                <p className="mt-4 text-xs text-orange-50/95">{syncMsg}</p>
              : null}

              <p className="mt-4 border-t border-orange-500/25 pt-4 text-[11px] text-orange-50/65">
                Can’t connect?{" "}
                <button
                  type="button"
                  className="font-medium underline underline-offset-2 hover:text-white"
                  onClick={() =>
                    document
                      .getElementById("subscribe-by-url")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                >
                  Use file / feed instead
                </button>
              </p>
            </div>
          : <div className="rounded-2xl border border-zinc-700/90 bg-zinc-900/50 p-5">
              <p className="text-sm leading-relaxed text-zinc-300">
                Direct Google sync isn’t switched on here — use{" "}
                <strong className="text-white">Import</strong> (recommended) or{" "}
                <strong className="text-white">From URL</strong> in the steps below.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                <Link
                  href={googleImportHelp}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-500 underline-offset-4 hover:text-zinc-400 hover:underline"
                >
                  Google Help: Import events
                </Link>
                <Link
                  href={googleSubscribeHelp}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-500 underline-offset-4 hover:text-zinc-400 hover:underline"
                >
                  Google Help: Subscribe from URL
                </Link>
              </div>
            </div>
          }

          {publicGoogleCal?.credentialsConfigured ?
            <div
              id="public-google-calendar"
              className="rounded-2xl border border-violet-400/35 bg-gradient-to-br from-violet-950/80 via-zinc-950 to-zinc-950 p-5 shadow-[0_0_36px_-14px_rgba(139,92,246,0.45)]"
            >
              <div className="flex items-start gap-2">
                <span className="rounded-md bg-violet-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-950">
                  Shared
                </span>
              </div>
              <h2 className="mt-3 font-semibold tracking-tight text-white text-lg">
                Public RacerCalendar (Google)
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-violet-100/85">
                Our server keeps <strong className="text-white">one Google calendar</strong> anyone
                can add — useful when you prefer Google&apos;s subscribe UI instead of Webcal.{" "}
                <strong className="text-white">Same schedule for everyone:</strong> use your
                personal feed below if you need filters (free-only, series).
              </p>

              {publicGoogleCal.subscribeHref && publicGoogleCal.calendarId ?
                <>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <a
                      href={publicGoogleCal.subscribeHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-xl bg-violet-500 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-violet-950/50 transition hover:bg-violet-400"
                    >
                      Add to Google Calendar
                    </a>
                    <button
                      type="button"
                      onClick={() => void copyPublicCalendarId()}
                      className="inline-flex min-h-[2.75rem] items-center justify-center rounded-xl border border-violet-400/40 bg-transparent px-4 py-2.5 text-sm font-medium text-violet-100 hover:bg-violet-500/10"
                    >
                      {copiedCalId ? "Copied" : "Copy calendar ID"}
                    </button>
                  </div>
                  <p className="mt-3 break-all font-mono text-[10px] leading-relaxed text-violet-200/70 sm:text-[11px]">
                    {publicGoogleCal.calendarId}
                  </p>
                </>
              : <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/35 px-3 py-3 text-xs leading-relaxed text-amber-100">
                  <p className="font-medium text-amber-50">First sync not run yet.</p>
                  <p className="mt-2 text-amber-100/90">
                    The host must call{" "}
                    <code className="rounded bg-black/30 px-1 py-px text-[10px]">
                      POST /api/calendar/service-sync
                    </code>{" "}
                    once with{" "}
                    <code className="rounded bg-black/30 px-1 py-px text-[10px]">
                      Authorization: Bearer …
                    </code>{" "}
                    (see <code className="rounded bg-black/30 px-1 py-px text-[10px]">.env.example</code>
                    ). Vercel Cron can keep it updated after that.
                  </p>
                </div>
              }
            </div>
          : null}

          <div
            id="subscribe-by-url"
            className="rounded-2xl border border-zinc-700/80 bg-zinc-950/65 p-5 lg:p-6"
          >
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Your calendar feed
              </h2>
              <p className="mt-1 max-w-[58ch] text-xs text-zinc-500 lg:text-[13px]">
                Recommended: subscribe for live updates whenever this feed changes (filters
                like only-free are baked into your link).{" "}
                <strong className="font-medium text-zinc-400">Download .ics file</strong> is a
                one-time snapshot. Same pattern as{" "}
                <Link
                  href="https://formulacalendar.com/subscribe/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-400 underline underline-offset-2 hover:text-zinc-300"
                >
                  Formula Calendar
                </Link>
                {" "}
                and{" "}
                <Link
                  href="https://better-f1-calendar.vercel.app"
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-400 underline underline-offset-2 hover:text-zinc-300"
                >
                  Better F1 Calendar
                </Link>
                .
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3">
              {webcalFeedUrl && !linkLoading && !signErr ?
                <a
                  href={webcalFeedUrl}
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[3rem] items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-500"
                >
                  Subscribe with Webcal
                </a>
              :             <span
                  className={`inline-flex min-h-[3rem] items-center justify-center rounded-xl bg-emerald-600/35 px-5 py-3 text-center text-sm font-semibold text-white ${
                    signErr ? "opacity-35" : linkLoading ? "opacity-50" : "opacity-35"
                  }`}
                  aria-disabled="true"
                >
                  Subscribe with Webcal
                </span>
              }

              <button
                type="button"
                disabled={!feedUrl || linkLoading || !!signErr || downloadBusy}
                onClick={() => void downloadIcsFile()}
                className="inline-flex min-h-[3rem] items-center justify-center rounded-xl border border-zinc-500 bg-zinc-800/90 px-5 py-3 text-center text-sm font-semibold text-zinc-100 hover:bg-zinc-700 disabled:pointer-events-none disabled:opacity-35"
              >
                {downloadBusy ? "Downloading…" : "Download .ics file"}
              </button>
            </div>

            <p className="mt-2 text-[11px] leading-snug text-zinc-500">
              <strong className="font-medium text-zinc-400">Webcal:</strong> on many phones —
              especially iPhone — this opens Calendar and asks you to confirm a subscribed
              calendar (often smoother than copying a URL).
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 gap-y-2">
              <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-600">
                Or copy URL:
              </span>
              <button
                type="button"
                disabled={!feedUrl || linkLoading || !!signErr}
                onClick={() => void copyUrl()}
                className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-35 sm:text-sm"
              >
                {copied ? "Copied" : "Copy HTTPS feed"}
              </button>
            </div>

            <div className="mt-3 break-all rounded-xl border border-dashed border-zinc-700 bg-black/35 px-3 py-2.5 font-mono text-[10px] leading-relaxed text-zinc-400 sm:text-[11px] lg:text-[12px]">
              {feedUrl ?
                feedUrl
              : signErr ?
                "— Link could not be created (see notice above)."
              : linkLoading ?
                "Building your calendar link…"
              : "—"}
            </div>

            <div className="mt-4 rounded-xl border border-sky-500/30 bg-sky-950/35 px-3 py-3 text-[12px] leading-relaxed text-sky-50/95 lg:text-[13px]">
              <p className="font-semibold text-sky-100">
                Prefer not to wrestle calendar.google.com on mobile?
              </p>
              <p className="mt-2 text-sky-100/90">
                Subscribing via URL is standardized (ICS/webcal); what isn’t standardized is{" "}
                <strong className="text-white">whether each vendor ships a sane mobile UI</strong>
                .
                {googleReady ?
                  <>
                    {" "}
                    Plenty of ticketing and sports apps avoid leaving you inside Google’s
                    cramped web console by syncing through your login instead{" "}
                    <button
                      type="button"
                      className="-mx-px font-medium text-orange-300 underline decoration-orange-400/40 underline-offset-2 hover:text-orange-200"
                      onClick={() =>
                        document
                          .getElementById("easiest-google")
                          ?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }
                    >
                      (tap Connect Google above).
                    </button>
                  </>
                : <>
                    {" "}
                    This site can do the same with Google OAuth when the host enables it
                    (“Connect Google”); until then use the{" "}
                    <strong className="text-white">download / subscribe</strong> buttons here.
                  </>}
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-[1.05rem] marker:text-sky-400">
                <li>
                  <strong className="text-white">Often easiest on phones:</strong> tapping{" "}
                  <strong className="text-white">Subscribe with Webcal</strong> on iPhone often
                  opens Calendar with a confirmation prompt; alternatively open a
                  downloaded <strong className="text-white">.ics</strong> from{" "}
                  <strong className="text-white">Files / Downloads</strong> — iOS or Android
                  usually offers to import without Google’s site.
                </li>
                <li>
                  <strong className="text-white">iPhone subscribed calendar:</strong> the big
                  green button uses a standard{" "}
                  <code className="text-[11px] text-sky-200">webcal:</code> subscription URL, or paste
                  the HTTPS feed at{" "}
                  <strong className="text-white">Settings → Calendar → Accounts → …</strong>{" "}
                  (<Link
                    href={appleSubscribedCalendarHelp}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-orange-300 underline underline-offset-2 hover:text-orange-200"
                  >
                    Apple’s guide
                  </Link>
                  ).
                </li>
                <li>
                  <strong className="text-white">Android + Google Calendar:</strong> there is no
                  first-class parity most people find — realistically add the subscription once from
                  a laptop (or tolerate the dusty web UI), then it syncs to the phone.
                </li>
              </ul>
              <p className="mt-3 text-xs text-sky-200/90">
                If you insist on browser-only Gmail: desktop-mode links —{" "}
                <Link
                  href={googleWebAddByUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-orange-300 underline underline-offset-2 hover:text-orange-200"
                >
                  subscribe by URL
                </Link>
                {" · "}
                <Link
                  href={googleWebImportExport}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-orange-300 underline underline-offset-2 hover:text-orange-200"
                >
                  import &amp; export
                </Link>
                .
              </p>
            </div>

            {googleSteps}

            <p className="mt-6 text-[11px] leading-snug text-zinc-600">
              Stream coverage varies by country — double-check listings before lights
              out.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
