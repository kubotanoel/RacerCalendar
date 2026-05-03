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
  const [signErr, setSignErr] = useState<string>("");
  const [googleReady, setGoogleReady] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string>("");
  const [syncBusy, setSyncBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggle = useCallback((c: Cat) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }, []);

  useEffect(() => {
    let alive = true;
    const run = async () => {
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
        if (!alive) return;
        if (!res.ok) {
          setSignErr(typeof data?.error === "string" ? data.error : "Sign failed");
          return;
        }
        setSignErr("");
        setToken(data.token as string);
      } catch {
        if (alive) setSignErr("Could not mint calendar link.");
      }
    };
    void run();
    return () => {
      alive = false;
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
          setSyncMsg("Signed in — use Push sync with your filters.");
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
          `Synced ${json.inserted as number} events (${n} sessions) → calendar “RacerCalendar”.`,
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
    window.setTimeout(() => setCopied(false), 2000);
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
      setSyncMsg(`Synced ${json.inserted} events (${n} sessions).`);
    } catch {
      setSyncMsg("Push failed.");
    } finally {
      setSyncBusy(false);
    }
  };

  const allSports = picked.size === 0;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8 px-4 pb-20 pt-10 sm:pt-14">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">
          RacerCalendar
        </p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Racing you can watch, in Calendar
        </h1>
        <p className="text-sm text-zinc-500">
          Pick series, grab a feed link — or sync to Google in one tap.
        </p>
      </header>

      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            Series
          </span>
          {allSports ? (
            <span className="text-xs font-medium text-zinc-600">All</span>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {CATEGORIES.map((c) => {
            const on = picked.has(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                title={SHORT_LABELS[c]}
                onClick={() => toggle(c)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-1 py-3 transition ${
                  on
                    ? "border-orange-500/70 bg-orange-600/25 text-orange-50 ring-1 ring-orange-500/40"
                    : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                }`}
              >
                <CategoryIcon category={c} />
                <span className="text-center text-[11px] font-medium leading-tight">
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
          title="Requires at least one free stream in data"
          onClick={() => setFreeOnly(!freeOnly)}
          className="flex w-full items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-left hover:border-zinc-700"
        >
          <span className="text-sm text-zinc-200">Free streams only</span>
          <span
            className={`relative inline-flex h-6 w-10 shrink-0 rounded-full transition ${
              freeOnly ? "bg-orange-600" : "bg-zinc-700"
            }`}
          >
            <span
              className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
                freeOnly ? "left-4" : "left-0.5"
              }`}
            />
          </span>
        </button>
      </section>

      <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            ICS link
          </h2>
          <Link
            href={googleSubscribeHelp}
            target="_blank"
            rel="noreferrer noopener"
            className="text-[11px] text-orange-400/90 underline-offset-2 hover:underline"
            title="Use “From URL” to stay in sync — not Settings → Import"
          >
            Subscribe from URL (Google)
          </Link>
        </div>
        {signErr ?
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {signErr}
          </p>
        : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <div className="min-h-[2.75rem] flex-1 break-all rounded-lg border border-dashed border-zinc-700 bg-zinc-950/80 px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-400">
            {feedUrl || "…"}
          </div>
          <button
            type="button"
            disabled={!feedUrl}
            onClick={() => void copyUrl()}
            className="shrink-0 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:pointer-events-none disabled:opacity-30"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Google sync
        </h2>

        {!googleReady ?
          <p className="rounded-lg bg-zinc-800/60 px-3 py-2 text-xs text-zinc-400 ring-1 ring-zinc-700/80">
            Set{" "}
            <code className="text-zinc-300">GOOGLE_CLIENT_ID</code>,{" "}
            <code className="text-zinc-300">GOOGLE_CLIENT_SECRET</code>,{" "}
            <code className="text-zinc-300">APP_ORIGIN</code> — redirect URI{" "}
            <code className="break-all text-zinc-300">
              …/api/auth/google/callback
            </code>
          </p>
        : sessionEmail ?
          <p className="text-xs text-orange-300/95">{sessionEmail}</p>
        : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!googleReady || !connectHref}
            onClick={startGoogleOAuth}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:pointer-events-none disabled:opacity-35"
          >
            Connect Google
          </button>
          <button
            type="button"
            disabled={syncBusy || !googleReady || !token}
            onClick={pushSyncManual}
            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800 disabled:pointer-events-none disabled:opacity-35"
          >
            {syncBusy ? "Syncing…" : "Push"}
          </button>
        </div>

        {syncMsg ?
          <p className="text-xs text-emerald-400/95">{syncMsg}</p>
        : null}

        <p className="text-[11px] leading-relaxed text-zinc-600">
          Stream links vary by region; confirm before race day.
        </p>
      </section>
    </div>
  );
}
