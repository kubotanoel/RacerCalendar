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
    baseWhere.watchOptions = {
      some: { archived: false, requiresPayment: false },
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
