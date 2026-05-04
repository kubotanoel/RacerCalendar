import { Suspense } from "react";

import { HomeClient, type LandingShellData } from "@/components/HomeClient";
import { serializePreviewSessions } from "@/lib/landing-serialize";
import { prisma } from "@/lib/prisma";
import { querySessionPreview } from "@/lib/session-preview";

function ShellFallback() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-24 text-stone-500 dark:text-zinc-500">
      Loading personalized calendar tools…
    </div>
  );
}

async function LoadedHome() {
  const [sessions, seriesBrief, seriesCount, sessionRowsTotal, upcomingTotal] =
    await Promise.all([
      querySessionPreview(5),
      prisma.series.findMany({
        select: { name: true, slug: true, category: true },
        orderBy: { name: "asc" },
      }),
      prisma.series.count(),
      prisma.session.count(),
      prisma.session.count({
        where: {
          endsAt: { gte: new Date() },
          watchOptions: { some: { archived: false } },
        },
      }),
    ]);

  const landingData: LandingShellData = {
    previewSessions: serializePreviewSessions(sessions),
    coverage: {
      series: seriesBrief,
      seriesCount,
      sessionRowsTotal,
      upcomingTotal,
      refreshCadence:
        "Import new race data with the admin snapshot API or CLI whenever your schedule changes. Public Google calendar sync can still run on a daily cron if configured.",
    },
  };

  return <HomeClient landingData={landingData} />;
}

/** Server wrapper — adds DB-backed coverage rows + session preview below the hero */
export default function HomePageShell() {
  return (
    <Suspense fallback={<ShellFallback />}>
      <LoadedHome />
    </Suspense>
  );
}
