import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Reuse one client per warm serverless instance (dev + prod). Avoids connection
 * churn and matches Prisma’s recommended pattern for Next.js on Vercel.
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
});

globalForPrisma.prisma = prisma;
