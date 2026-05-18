"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import { FilterStatusBanner } from "@/components/landing/FilterStatusBanner";
import {
  LandingCoverageAndPreview,
  type LandingCoverageData,
} from "@/components/landing/LandingCoverageAndPreview";
import { LandingDisclaimer } from "@/components/landing/LandingDisclaimer";
import { GoogleOAuthSection } from "@/components/landing/GoogleOAuthSection";
import { LandingHero } from "@/components/landing/LandingHero";
import { SubscribeCard } from "@/components/landing/SubscribeCard";
import { SeriesFilterGrid } from "@/components/landing/SeriesFilterGrid";
import type { UiCategory as Cat } from "@/components/CategoryIcon";
import type { SerializedPreviewSession } from "@/lib/landing-serialize";

const GOOGLE_IMPORT_HELP =
  "https://support.google.com/calendar/answer/37118?hl=en&co=GENIE.Platform%3DDesktop";
const GOOGLE_SUBSCRIBE_HELP = "https://support.google.com/calendar/answer/37100?hl=en";
const GOOGLE_WEB_ADD_BY_URL =
  "https://calendar.google.com/calendar/r/settings/addbyurl";
const GOOGLE_WEB_IMPORT_EXPORT =
  "https://calendar.google.com/calendar/r/settings/export";
const APPLE_SUBSCRIBED_CAL_HELP =
  "https://support.apple.com/guide/iphone/use-multiple-calendars-iph8677073cfd/ios";

export type LandingShellData = {
  previewSessions: SerializedPreviewSession[];
  coverage: LandingCoverageData;
};

export function HomeClient({ landingData }: { landingData: LandingShellData }) {
  const searchParams = useSearchParams();
  const signFirstCycle = useRef(true);

  const [picked, setPicked] = useState<Set<Cat>>(new Set());
  const [freeOnly, setFreeOnly] = useState(true);
  const [token, setToken] = useState<string>("");
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [signErr, setSignErr] = useState<string>("");
  const [oauthBannerMsg, setOauthBannerMsg] = useState<string | null>(null);
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

  const clearCategories = useCallback(() => {
    setPicked(new Set());
  }, []);

  const resetAllFilters = useCallback(() => {
    setPicked(new Set());
    setFreeOnly(false);
  }, []);

  const filtersActive = picked.size > 0 || freeOnly;

  useEffect(() => {
    let stale = false;
    const payload = () => ({
      categories: Array.from(picked),
      freeOnly,
    });

    const run = async () => {
      await Promise.resolve();
      if (stale) return;
      setLinkLoading(true);
      setSignErr("");
      const body = payload();
      try {
        const res = await fetch("/api/calendar/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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

    const immediate = signFirstCycle.current;
    if (signFirstCycle.current) signFirstCycle.current = false;

    let timer: number | undefined;
    if (immediate) {
      void run();
    } else {
      timer = window.setTimeout(() => void run(), 230);
    }

    return () => {
      stale = true;
      if (timer !== undefined) window.clearTimeout(timer);
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
      setOauthBannerMsg(msg);
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

  const googleHeroSidecar =
    !!publicGoogleCal?.subscribeHref || !!publicGoogleCal?.credentialsConfigured;

  const urlBundle = useMemo(
    () => ({
      googleImportHelp: GOOGLE_IMPORT_HELP,
      googleSubscribeHelp: GOOGLE_SUBSCRIBE_HELP,
      appleSubscribedCalendarHelp: APPLE_SUBSCRIBED_CAL_HELP,
      googleWebAddByUrl: GOOGLE_WEB_ADD_BY_URL,
      googleWebImportExport: GOOGLE_WEB_IMPORT_EXPORT,
    }),
    [],
  );

  return (
    <div id="main" tabIndex={-1} className="outline-none">
      {oauthBannerMsg ?
        <div
          role="alert"
          className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 xl:max-w-6xl xl:px-10"
        >
          <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950 shadow-sm dark:border-red-500/35 dark:bg-red-500/18 dark:text-red-50">
            <p className="min-w-0 flex-1 leading-relaxed">{oauthBannerMsg}</p>
            <button
              type="button"
              className="-m-1 shrink-0 rounded-lg p-1 text-red-900 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:text-red-100 dark:hover:bg-red-500/35"
              aria-label="Dismiss"
              onClick={() => setOauthBannerMsg(null)}
            >
              <X className="size-5" strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>
      : null}

      <div className="mx-auto max-w-5xl px-4 pb-32 pt-6 max-lg:pb-[7.5rem] sm:px-6 lg:max-w-6xl lg:pb-40 lg:pt-10 xl:max-w-7xl 2xl:px-12">
        <div className="flex flex-col gap-12 lg:gap-16">
          <LandingHero />

          <LandingCoverageAndPreview
            coverage={landingData.coverage}
            previewSessions={landingData.previewSessions}
          />

          <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-10 xl:gap-x-16 2xl:gap-x-20">
            <div className="flex flex-col gap-8 lg:col-span-7 lg:gap-10">
              <SeriesFilterGrid picked={picked} onToggle={toggle} onClearCategories={clearCategories} />

              <div className="flex flex-col gap-4 lg:gap-5">
                <button
                  type="button"
                  role="switch"
                  aria-checked={freeOnly}
                  aria-labelledby="free-only-heading free-only-hint"
                  title="Sessions need at least one free stream in our data."
                  id="free-only-switch"
                  onClick={() => setFreeOnly(!freeOnly)}
                  className="flex min-h-[52px] items-center justify-between gap-6 rounded-2xl border border-[var(--border-muted-strong)] bg-[var(--surface-elevated)] px-5 py-4 text-left shadow-sm transition motion-reduce:transition-none hover:border-orange-400/70 hover:bg-[var(--surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 active:bg-[var(--surface-muted)] lg:max-w-md lg:min-h-0 lg:py-3.5 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
                >
                  <div>
                    <p
                      id="free-only-heading"
                      className="text-[15px] font-medium text-stone-900 dark:text-zinc-100"
                    >
                      Only show free streams
                    </p>
                    <p id="free-only-hint" className="mt-0.5 text-[13px] text-[var(--text-secondary)] dark:text-zinc-500">
                      Hides races we only know as paid-only.
                    </p>
                  </div>
                  <span
                    className={`motion-reduce:transition-none relative inline-flex h-[26px] w-[46px] shrink-0 rounded-full transition ${
                      freeOnly ? "bg-orange-600" : "bg-zinc-500 dark:bg-zinc-600"
                    }`}
                    aria-hidden
                  >
                    <span
                      className={`motion-reduce:transition-none absolute top-[3px] size-5 rounded-full bg-white shadow transition-all ${
                        freeOnly ? "left-[21px]" : "left-[3px]"
                      }`}
                    />
                  </span>
                </button>

                {signErr ?
                  <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-950 dark:border-red-500/35 dark:bg-red-500/15 dark:text-red-50">
                    {signErr}
                  </p>
                : null}

                <FilterStatusBanner
                  sessionCount={sessionCount}
                  dbTotals={dbTotals}
                  filtersActive={filtersActive}
                  onResetFilters={resetAllFilters}
                />
              </div>
            </div>

            <aside className="mt-10 flex flex-col gap-5 border-t border-[var(--border-muted)] pt-10 lg:sticky lg:top-20 lg:col-span-5 lg:mt-0 lg:border-none lg:pt-0 xl:top-[4.75rem]">
              <SubscribeCard
                cardId="subscribe-by-url"
                publicGoogleCal={publicGoogleCal}
                googleHeroSidecar={googleHeroSidecar}
                webcalFeedUrl={webcalFeedUrl}
                linkLoading={linkLoading}
                signErr={signErr}
                feedUrl={feedUrl}
                copyUrl={() => void copyUrl()}
                copied={copied}
                downloadIcsFile={() => void downloadIcsFile()}
                downloadBusy={downloadBusy}
                copyPublicCalendarId={() => void copyPublicCalendarId()}
                copiedCalId={copiedCalId}
                googleReady={googleReady}
                otherOptionsOpen={otherOptionsOpen}
                onToggleOtherOptions={() => setOtherOptionsOpen((o) => !o)}
                urls={urlBundle}
              />

              {googleReady ?
                <GoogleOAuthSection
                  sessionEmail={sessionEmail}
                  connectHref={connectHref}
                  syncMsg={syncMsg}
                  syncBusy={syncBusy}
                  token={token}
                  onStartOAuth={startGoogleOAuth}
                  onPushSync={() => void pushSyncManual()}
                  onScrollSubscribe={() =>
                    document
                      .getElementById("subscribe-by-url")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                />
              : null}
            </aside>
          </div>

          <LandingDisclaimer className="mt-12 lg:mt-16" />
        </div>
      </div>

      <nav
        aria-label="Jump to calendar subscribe"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-muted-strong)] bg-[var(--surface-elevated)]/95 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--surface-elevated)]/85 lg:hidden dark:border-zinc-700 dark:bg-zinc-950/95"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto flex max-w-lg items-center gap-2 px-3 py-2.5">
          <a
            href="#subscribe-by-url"
            className="flex min-h-[48px] flex-1 touch-manipulation items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 px-4 text-center text-sm font-semibold text-white shadow-md shadow-emerald-950/30 transition active:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          >
            Subscribe — add to calendar
          </a>
        </div>
      </nav>
    </div>
  );
}
