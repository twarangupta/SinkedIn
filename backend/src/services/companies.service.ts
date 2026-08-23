/**
 * Company service — the centralized company entity (Phase 2 audit: capture-now).
 *
 * Companies are NEUTRAL identity (names only, no PII), shared across users so
 * Jobs, Sinks, interviews, and salary reports can later point at one company and
 * power aggregated insights. Deduped by a normalized name so "Razorpay",
 * " razorpay " and "RAZORPAY" collapse to one row.
 *
 * For now this is used transparently: the tracker resolves the free-text
 * company a user types into a Company via findOrCreateCompany, so the table
 * fills from real usage with no new UI. A prefix-search helper for the
 * autocomplete picker will be added when that UI is built.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

/** Canonical key for dedupe: trimmed, lowercased, single-spaced. */
function normalizeCompanyName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Resolve a typed company name to a Company row, creating it if new. Returns
 * null for an empty name. Safe under a concurrent create (unique conflict falls
 * back to a re-find).
 */
export async function findOrCreateCompany(name: string, createdById?: string) {
  const normalizedName = normalizeCompanyName(name);
  if (!normalizedName) return null;

  const existing = await prisma.company.findUnique({ where: { normalizedName } });
  if (existing) return existing;

  try {
    return await prisma.company.create({
      data: { name: name.trim(), normalizedName, createdById },
    });
  } catch (err) {
    // Another request created it first — re-find and use that row.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return prisma.company.findUnique({ where: { normalizedName } });
    }
    throw err;
  }
}
