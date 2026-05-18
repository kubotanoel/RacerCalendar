import type { Category, Prisma } from "@prisma/client";

import type { FeedPayload } from "@/lib/calendar-token";
import { prisma } from "@/lib/prisma";

export type SessionWithRelations = Prisma.SessionGetPayload<{
  include: {
    watchOptions: true;
    event: {
      include: {
        series: true;
      };
    };
  };
}>;

export async function querySessionsForFeed(
  payload: FeedPayload,
): Promise<SessionWithRelations[]> {
  const categories: Category[] =
    payload.categories.length > 0 ? payload.categories : [];

  /** Keep sessions that haven't ended yet (future + ongoing). */
  const baseWhere: Prisma.SessionWhereInput = {
    endsAt: { gte: new Date() },
    watchOptions: { some: { archived: false } },
    event: {
      series:
        categories.length > 0
          ? {
              category: { in: categories },
            }
          : undefined,
    },
  };

  if (payload.freeOnly) {
    // "Free" means there is at least one option that is BOTH no-cost AND carries the
    // race live. Free highlights/clips alone (e.g. F1 YouTube) don't count.
    baseWhere.watchOptions = {
      some: { archived: false, requiresPayment: false, liveCoverage: true },
    };
  }

  const watchInclude: Prisma.WatchOptionWhereInput = { archived: false };

  return prisma.session.findMany({
    where: baseWhere,
    orderBy: { startsAt: "asc" },
    include: {
      watchOptions: { where: watchInclude },
      event: {
        include: { series: true },
      },
    },
    take: 500,
  });
}
