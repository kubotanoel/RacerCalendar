import type { SessionWithRelations } from "@/lib/session-query";

import { prisma } from "@/lib/prisma";

/** Upcoming sessions for landing preview — all categories, not free-only-filtered */
export async function querySessionPreview(limit: number): Promise<SessionWithRelations[]> {
  return prisma.session.findMany({
    where: {
      endsAt: { gte: new Date() },
      watchOptions: {
        some: { archived: false },
      },
    },
    orderBy: { startsAt: "asc" },
    include: {
      watchOptions: { where: { archived: false } },
      event: { include: { series: true } },
    },
    take: limit,
  });
}
