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

  const googleHeroSidecar =
    !!publicGoogleCal?.subscribeHref || !!publicGoogleCal?.credentialsConfigured;

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
              In <strong className="text-emerald-50">Other options</strong> tap{" "}
              <strong className="text-emerald-50">Download .ics</strong> (
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
              In <strong className="text-white">Other options</strong> tap{" "}
              <strong className="text-white">Copy HTTPS feed</strong>, then paste in Google Calendar.
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

        {/* Calendar actions — unified hero + collapsible extras */}
        <aside className="order-1 flex flex-col gap-5 lg:order-2 lg:col-span-6 xl:col-span-5 lg:sticky lg:top-[5.25rem]">
          <div
            id="subscribe-by-url"
            className="overflow-hidden rounded-3xl border-2 border-zinc-600/65 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-5 shadow-xl shadow-black/40 lg:p-7"
          >
            <header className="space-y-1.5">
              <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                Get races on your calendar
              </h2>
              <p className="text-xs leading-relaxed text-zinc-500 sm:text-[13px]">
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
                <div className="flex min-h-[3.25rem] flex-col justify-center rounded-2xl border border-dashed border-violet-500/35 bg-violet-950/25 px-4 py-3 text-center">
                  <span className="text-sm font-semibold text-violet-200">
                    Add to Google Calendar
                  </span>
                  <span className="mt-1 text-[11px] text-violet-300/85">
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
                  className={`inline-flex min-h-[3.25rem] items-center justify-center rounded-2xl border border-zinc-600 bg-zinc-800/50 px-5 py-3.5 text-center text-[15px] font-semibold text-zinc-500 ${
                    signErr ? "opacity-35" : linkLoading ? "opacity-55" : "opacity-40"
                  }`}
                  aria-disabled="true"
                >
                  Add to Calendar
                </span>
              }
            </div>

            <p className="mt-3 text-center text-[11px] leading-snug text-zinc-500 sm:text-left">
              <strong className="font-medium text-zinc-400">Google:</strong> same full schedule for
              all subscribers.&nbsp;
              <strong className="font-medium text-zinc-400">Calendar app:</strong> respects your
              series + free‑stream filters (
              <span className="text-zinc-500">{linkLoading ? "loading…" : "Webcal subscription"}</span>
              ).
            </p>

            <div className="mt-7 border-t border-zinc-700/90 pt-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                Other options
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!feedUrl || linkLoading || !!signErr || downloadBusy}
                  onClick={() => void downloadIcsFile()}
                  className="rounded-xl border border-zinc-600 bg-zinc-800/80 px-3.5 py-2 text-xs font-medium text-zinc-100 hover:bg-zinc-700 disabled:pointer-events-none disabled:opacity-35 sm:text-[13px]"
                >
                  {downloadBusy ? "Downloading…" : "Download .ics"}
                </button>
                <button
                  type="button"
                  disabled={!feedUrl || linkLoading || !!signErr}
                  onClick={() => void copyUrl()}
                  className="rounded-xl border border-zinc-600 bg-zinc-800/80 px-3.5 py-2 text-xs font-medium text-zinc-100 hover:bg-zinc-700 disabled:pointer-events-none disabled:opacity-35 sm:text-[13px]"
                >
                  {copied ? "Copied" : "Copy HTTPS feed"}
                </button>
                {publicGoogleCal?.calendarId ?
                  <button
                    type="button"
                    onClick={() => void copyPublicCalendarId()}
                    className="rounded-xl border border-zinc-600 bg-zinc-800/80 px-3.5 py-2 text-xs font-medium text-zinc-100 hover:bg-zinc-700 sm:text-[13px]"
                  >
                    {copiedCalId ? "Copied calendar ID" : "Copy calendar ID"}
                  </button>
                : null}
              </div>

              <p className="mt-3 font-mono text-[10px] leading-relaxed text-zinc-500 sm:text-[11px]">
                {feedUrl ?
                  <span className="break-all">{feedUrl}</span>
                : signErr ?
                  "Personal feed unavailable — fix error above."
                : linkLoading ?
                  "Personal feed signing…"
                : "—"}
              </p>

              {!googleReady ?
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                  <Link
                    href={googleImportHelp}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-600 underline-offset-4 hover:text-zinc-400 hover:underline"
                  >
                    Google: Import
                  </Link>
                  <Link
                    href={googleSubscribeHelp}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-600 underline-offset-4 hover:text-zinc-400 hover:underline"
                  >
                    Google: Subscribe URL
                  </Link>
                  <Link
                    href={appleSubscribedCalendarHelp}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-600 underline-offset-4 hover:text-zinc-400 hover:underline"
                  >
                    Apple: Subscribed calendars
                  </Link>
                  <Link
                    href={googleWebAddByUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-600 underline-offset-4 hover:text-zinc-400 hover:underline"
                  >
                    Gmail: Web add-by-URL
                  </Link>
                </div>
              : null}

              <details className="group mt-5 rounded-xl border border-zinc-700/70 bg-black/25">
                <summary className="cursor-pointer select-none px-3 py-3 text-xs font-medium text-zinc-400 marker:text-zinc-500 hover:text-zinc-200">
                  More help · mobile Gmail · Apple · steps
                  <span className="mt-1 block font-normal text-[11px] text-zinc-600 group-open:hidden">
                    Tap if Webcal/Google didn&apos;t cooperate.
                  </span>
                </summary>
                <div className="space-y-4 border-t border-zinc-800 px-3 py-4 text-[12px] text-zinc-400">
                  <div className="rounded-lg border border-sky-500/25 bg-sky-950/20 px-3 py-3 leading-relaxed">
                    <p className="font-medium text-sky-100">
                      Phones &amp; Google&apos;s cramped UI?
                    </p>
                    <p className="mt-2 text-sky-100/88">
                      <strong className="text-white">Add to Calendar</strong> opens your app;{" "}
                      <strong className="text-white">Download .ics</strong> from Files often works too.
                      {googleReady ?
                        <>
                          {" "}
                          <button
                            type="button"
                            className="-mx-px font-medium text-orange-300 underline decoration-orange-400/40 underline-offset-2 hover:text-orange-200"
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
                            className="-mx-px font-medium text-orange-300 underline decoration-orange-400/40 underline-offset-2 hover:text-orange-200"
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
                        className="text-orange-300 underline underline-offset-2 hover:text-orange-200"
                      >
                        Gmail import &amp; export
                      </Link>
                      {" · "}
                      <Link
                        href="https://formulacalendar.com/subscribe/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-orange-300 underline underline-offset-2 hover:text-orange-200"
                      >
                        Formula&nbsp;Calendar
                      </Link>
                      .
                    </p>
                  </div>
                  {googleSteps}
                </div>
              </details>

              <p className="mt-5 text-[11px] leading-snug text-zinc-600">
                Stream coverage varies by country — verify before lights&nbsp;out.
              </p>
            </div>
          </div>

          {googleReady ?
            <div
              id="easiest-google"
              className="overflow-hidden rounded-2xl border border-orange-500/40 bg-gradient-to-br from-orange-950/85 via-zinc-950 to-zinc-950 p-5 shadow-[0_0_32px_-12px_rgba(234,88,12,0.4)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-orange-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-950">
                  Optional
                </span>
                <h2 className="text-[15px] font-semibold text-white">
                  Signed-in Google Calendar
                </h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-orange-50/82">
                We create / refresh <strong className="text-white">RacerCalendar</strong> in{" "}
                <em>your</em> Gmail account (
                <strong className="text-white">respects filters</strong> via Push sync).
              </p>
              {sessionEmail ?
                <p className="mt-2 text-[11px] text-orange-100/90">{sessionEmail}</p>
              : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!connectHref}
                  onClick={startGoogleOAuth}
                  className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-orange-950 shadow-md shadow-orange-900/35 transition hover:bg-orange-400 disabled:pointer-events-none disabled:opacity-40"
                >
                  Connect Google
                </button>
                <button
                  type="button"
                  disabled={syncBusy || !token}
                  onClick={pushSyncManual}
                  className="rounded-xl border border-orange-400/50 bg-transparent px-3 py-2.5 text-sm font-medium text-orange-50 hover:bg-orange-500/12 disabled:pointer-events-none disabled:opacity-40"
                >
                  {syncBusy ? "Syncing…" : "Push / refresh"}
                </button>
              </div>
              {syncMsg ?
                <p className="mt-3 text-[11px] text-orange-50/90">{syncMsg}</p>
              : null}
              <button
                type="button"
                className="mt-3 block text-[11px] font-medium text-orange-50/60 underline underline-offset-2 hover:text-orange-50"
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
