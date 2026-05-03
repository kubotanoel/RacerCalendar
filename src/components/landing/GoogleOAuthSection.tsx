"use client";

type Props = {
  sessionEmail: string | null;
  connectHref: string;
  syncMsg: string;
  syncBusy: boolean;
  token: string;
  onStartOAuth: () => void;
  onPushSync: () => void;
  onScrollSubscribe: () => void;
};

export function GoogleOAuthSection({
  sessionEmail,
  connectHref,
  syncMsg,
  syncBusy,
  token,
  onStartOAuth,
  onPushSync,
  onScrollSubscribe,
}: Props) {
  return (
    <div
      id="easiest-google"
      className="motion-reduce:transition-none overflow-hidden rounded-2xl border border-[var(--border-muted-strong)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-card)] dark:border-orange-500/35 dark:bg-zinc-900 dark:shadow-[0_8px_30px_-12px_rgba(234,88,12,0.35)]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-orange-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm motion-reduce:transition-none dark:bg-orange-500 dark:text-orange-950 dark:shadow-none">
          Optional
        </span>
        <h2 className="text-[15px] font-semibold text-stone-900 dark:text-white">
          Signed-in Google Calendar
        </h2>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)] dark:text-orange-50/82">
        We create / refresh <strong className="text-stone-950 dark:text-white">RacerCalendar</strong> in{" "}
        <em>your</em> Gmail account (<strong className="text-stone-950 dark:text-white">respects filters</strong> via
        push sync).
      </p>
      {sessionEmail ? <p className="mt-2 text-[12px] text-[var(--text-secondary)] dark:text-orange-100/90">{sessionEmail}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!connectHref}
          onClick={onStartOAuth}
          className="motion-reduce:transition-none rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-900/35 transition hover:from-orange-500 hover:to-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:pointer-events-none disabled:opacity-40 dark:from-orange-500 dark:to-orange-500 dark:text-orange-950 dark:hover:from-orange-400 dark:hover:to-orange-400 dark:shadow-orange-950/55"
        >
          Connect Google
        </button>
        <button
          type="button"
          disabled={syncBusy || !token}
          onClick={onPushSync}
          className="motion-reduce:transition-none rounded-xl border border-orange-600/35 bg-orange-600/10 px-3 py-2.5 text-sm font-medium text-stone-900 transition hover:bg-orange-600/14 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:pointer-events-none disabled:opacity-40 dark:border-orange-400/50 dark:bg-transparent dark:text-orange-50 dark:hover:bg-orange-500/12"
        >
          {syncBusy ? "Syncing…" : "Push / refresh"}
        </button>
      </div>
      {syncMsg ? <p className="mt-3 text-[12px] text-[var(--text-secondary)] dark:text-orange-50/90">{syncMsg}</p> : null}
      <button
        type="button"
        className="mt-3 block text-left text-[12px] font-medium text-[var(--text-secondary)] underline underline-offset-2 hover:text-stone-900 focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 dark:text-orange-50/65 dark:hover:text-orange-50"
        onClick={onScrollSubscribe}
      >
        Prefer Webcal / public Google calendar above
      </button>
    </div>
  );
}
