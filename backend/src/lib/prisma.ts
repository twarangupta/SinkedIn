/**
 * Shared PrismaClient instance (the single data-access entry point).
 *
 * ARCHITECTURE RULE (see CLAUDE.md): this module may only be imported by the
 * services layer. Routes and controllers must never touch Prisma directly —
 * they call services, and services call this client.
 *
 * WHY A SINGLETON: PrismaClient opens a pool of database connections. Creating
 * a new client per request (or re-creating it on every hot-reload in dev) would
 * leak connections until the database refuses new ones. We create exactly one
 * client for the whole process and reuse it everywhere.
 *
 * The `globalThis` guard below keeps a single instance alive across the module
 * re-evaluations that `tsx watch` triggers on file save during development. In
 * production the process starts once, so the guard is simply a no-op.
 */

import { PrismaClient } from '@prisma/client';

// Extend the global type so TypeScript knows about our cached client.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * The one PrismaClient the whole backend shares.
 * Reused from the global cache in dev; freshly created in production.
 */
// Prod: errors only. Dev: warnings + errors (quiet terminal). Set
// PRISMA_LOG_QUERIES=true to also log every SQL query when debugging.
const logLevels =
  process.env.NODE_ENV === 'production'
    ? (['error'] as const)
    : process.env.PRISMA_LOG_QUERIES === 'true'
      ? (['query', 'warn', 'error'] as const)
      : (['warn', 'error'] as const);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: [...logLevels] });

// In development, stash the instance on the global object so the next
// hot-reload reuses it instead of opening a second connection pool.
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
