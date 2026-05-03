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
  const [linkLoading, setLinkLoading] = useState(true);

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
          setSignErr(typeof data?.error === "string" ? data.error : "Sign failed");
          return;
        }
        setSignErr("");
        setToken(typeof data.token === "string" ? data.token : "");
        setSessionCount(
          typeof data.sessionCount === "number" ? data.sessionCount : null,
        );
      } catch {
        if (stale) return;
        setToken("");
        setSessionCount(null);
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
      .then((j: { googleConfigured?: boolean; signedIn?: boolean; email?: string | null }) => {
        setGoogleReady(!!j.googleConfigured);
        if (j.signedIn && j.email) setSessionEmail(j.email);
      })
      .catch(() => {});
  }, []);

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
      <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        <p className="font-medium text-amber-50">Nothing matches yet.</p>
        <p className="mt-1 text-xs leading-relaxed text-amber-200/90">
          Turn off <strong>Only free streams</strong>, or leave each series unchecked
          to include everything. If it still stays empty here, Google won’t either —
          race data might not be live on this deployment yet (try again later), or{" "}
          Google can take hours to refresh a new subscribe link.
        </p>
      </div>
    : <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/35 px-4 py-2.5 text-sm text-emerald-100">
        <strong className="text-emerald-50">{sessionCount}</strong>
        {" "}
        {sessionCount === 1 ? "race session" : "race sessions"}
        {" "}
        in your calendar — subscribe or sync below so Google can load them.
      </div>;

  const googleSteps = (
    <ol className="mt-4 list-none space-y-3 text-[13px] leading-snug text-zinc-300 lg:text-sm">
      <li className="flex gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-semibold text-white">
          1
        </span>
        <span className="pt-px">
          Tap <strong className="text-white">Copy link</strong> below (your personal
          feed).
        </span>
      </li>
      <li className="flex gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-semibold text-white">
          2
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
          on a computer (easiest).
        </span>
      </li>
      <li className="flex gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-semibold text-white">
          3
        </span>
        <span className="pt-px">
          Beside <strong className="text-white">Other calendars</strong>, click{" "}
          <strong className="text-white">+</strong> →{" "}
          <strong className="text-white">From URL</strong> (
          <span className="italic">not</span> Import — that’s one-time upload).
        </span>
      </li>
      <li className="flex gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-semibold text-white">
          4
        </span>
        <span className="pt-px">
          Paste the link → add calendar.{" "}
          Wait a few minutes — Google refreshes subscribed calendars slowly the first time.
        </span>
      </li>
    </ol>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-10 sm:px-6 lg:pb-32 lg:pt-14 xl:px-10">
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-14 lg:gap-y-12">
        {/* Hero + filters column */}
        <div className="flex flex-col gap-8 lg:col-span-6 xl:col-span-7 lg:gap-10">
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

        {/* Calendar actions column — sticky on desktop */}
        <aside className="flex flex-col gap-5 lg:col-span-6 xl:col-span-5 lg:sticky lg:top-[5.25rem]">
          {googleReady ?
            <div className="overflow-hidden rounded-2xl border-2 border-orange-500/50 bg-gradient-to-br from-orange-950/85 via-zinc-950 to-zinc-950 p-6 shadow-[0_0_40px_-12px_rgba(234,88,12,0.45)]">
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
                  Use subscribe link instead
                </button>
              </p>
            </div>
          : <div className="rounded-2xl border border-zinc-700/90 bg-zinc-900/50 p-5">
              <p className="text-sm leading-relaxed text-zinc-300">
                Direct Google sync isn’t switched on here, so{" "}
                <strong className="text-white">follow the boxed steps below</strong> —
                paste your personal link into Calendar.
              </p>
              <Link
                href={googleSubscribeHelp}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex text-[11px] text-zinc-500 underline-offset-4 hover:text-zinc-400 hover:underline"
              >
                Google Help: Subscribe from URL
              </Link>
            </div>
          }

          <div
            id="subscribe-by-url"
            className="rounded-2xl border border-zinc-700/80 bg-zinc-950/65 p-5 lg:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-2 lg:gap-4">
              <div>
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Paste link — Google Calendar
                </h2>
                <p className="mt-1 max-w-[50ch] text-xs text-zinc-500 lg:text-[13px]">
                  Takes about a minute. Use a laptop browser — the phone app hides this.
                </p>
              </div>
              <button
                type="button"
                disabled={!feedUrl || linkLoading || !!signErr}
                onClick={() => void copyUrl()}
                className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-35"
              >
                {copied ? "Copied" : "Copy link"}
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
