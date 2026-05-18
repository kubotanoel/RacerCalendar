/** JSON shape POSTed to /api/admin/import-snapshot */

export type SnapshotWatchOptionInput = {
  platform: string;
  url: string;
  requiresPayment?: boolean;
  /**
   * `true` (default) = this option carries the race live.
   * `false` = free post-session highlights / clips only (e.g. F1 official YouTube).
   * The "Only free live streams" filter requires `requiresPayment=false AND liveCoverage=true`.
   */
  liveCoverage?: boolean;
  notes?: string | null;
  regions?: string | null;
  sourceUrl?: string | null;
  lastVerifiedAt?: string | null;
  archived?: boolean;
};

export type SnapshotSessionInput = {
  externalKey?: string | null;
  title: string;
  kind?: string | null;
  startsAt: string;
  endsAt: string;
  dataSourceUrl?: string | null;
  watchOptions: SnapshotWatchOptionInput[];
};

export type SnapshotEventInput = {
  slug: string;
  name: string;
  venueName: string;
  timezone: string;
  startDate: string;
  endDate?: string | null;
  ingestSource?: string;
  dataSourceUrl?: string | null;
  sessions: SnapshotSessionInput[];
};

export type SnapshotSeriesInput = {
  slug: string;
  name: string;
  category: string;
  ingestSource?: string;
  dataSourceUrl?: string | null;
  licenseNotes?: string | null;
  events: SnapshotEventInput[];
};

export type SnapshotBundleInput = {
  /**
   * Opt-in destructive flag. When `true`, ALL existing Series rows (and their cascaded events,
   * sessions, watch options) are deleted before the upsert runs in the same transaction.
   * Use for full-replace imports (e.g. clearing demo seed). Defaults to additive upsert.
   */
  replace?: boolean;
  series: SnapshotSeriesInput[];
};
