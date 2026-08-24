/**
 * Seed the Company reference table from prisma/data/companies.json (name +
 * domain). This is real reference data (not demo data): it should exist in dev
 * AND prod so the tracker's company autocomplete has something to search.
 *
 * Idempotent: `createMany` with `skipDuplicates` on the unique `normalizedName`,
 * so re-running (or running after users have already added companies) only
 * inserts what's missing and never errors. Domains are plain text; no logo
 * images are stored.
 *
 * Run with:  npm run db:seed:companies
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const prisma = new PrismaClient();
const here = dirname(fileURLToPath(import.meta.url));

const normalize = (n: string) => n.trim().toLowerCase().replace(/\s+/g, ' ');

async function main() {
  const raw = JSON.parse(
    readFileSync(join(here, 'data/companies.json'), 'utf8'),
  ) as { name: string; domain: string }[];

  // Dedupe within the batch by normalized name before inserting.
  const seen = new Set<string>();
  const rows: { name: string; normalizedName: string; domain: string }[] = [];
  for (const c of raw) {
    const normalizedName = normalize(c.name);
    if (!normalizedName || seen.has(normalizedName)) continue;
    seen.add(normalizedName);
    rows.push({ name: c.name, normalizedName, domain: c.domain });
  }

  const res = await prisma.company.createMany({ data: rows, skipDuplicates: true });

  // Backfill domains onto companies that already existed with no domain (e.g.
  // ones created earlier via the tracker's find-or-create) so their logo works.
  const domainByName = new Map(rows.map((r) => [r.normalizedName, r.domain]));
  const missing = await prisma.company.findMany({
    where: { domain: null },
    select: { id: true, normalizedName: true },
  });
  let backfilled = 0;
  for (const c of missing) {
    const domain = domainByName.get(c.normalizedName);
    if (domain) {
      await prisma.company.update({ where: { id: c.id }, data: { domain } });
      backfilled++;
    }
  }

  const total = await prisma.company.count();
  // eslint-disable-next-line no-console
  console.log(
    `Seeded companies: +${res.count} new, ${backfilled} domains backfilled (of ${rows.length}). Total: ${total}.`,
  );
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Company seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
