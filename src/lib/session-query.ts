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

  const baseWhere: Prisma.SessionWhereInput = {
    startsAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
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
      some: { requiresPayment: false },
    };
  }

  return prisma.session.findMany({
    where: baseWhere,
    orderBy: { startsAt: "asc" },
    include: {
      watchOptions: true,
      event: {
        include: { series: true },
      },
    },
    take: 500,
  });
}
