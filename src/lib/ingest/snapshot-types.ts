/** JSON shape POSTed to /api/admin/import-snapshot */

export type SnapshotWatchOptionInput = {
  platform: string;
  url: string;
  requiresPayment?: boolean;
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
  series: SnapshotSeriesInput[];
};
