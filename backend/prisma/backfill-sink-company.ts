/**
 * One-off maintenance: link existing Sinks that have a free-text `company` but
 * no `companyId` to the centralized Company entity (find-or-create by
 * normalized name). Idempotent — it only touches sinks that aren't linked yet,
 * so it's safe to re-run. Run once per environment after the add_sink_company
 * migration (dev is already done; run it on prod).
 *
 * Run:  npm run db:backfill:sink-company
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const norm = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

async function main() {
  const sinks = await prisma.sink.findMany({
    where: { company: { not: null }, companyId: null },
    select: { id: true, company: true },
  });

  let linked = 0;
  for (const s of sinks) {
    const name = s.company;
    if (!name) continue;
    const key = norm(name);
    const company =
      (await prisma.company.findUnique({ where: { normalizedName: key } })) ??
      (await prisma.company.create({
        data: { name: name.trim(), normalizedName: key },
      }));
    await prisma.sink.update({ where: { id: s.id }, data: { companyId: company.id } });
    linked++;
  }

  // eslint-disable-next-line no-console
  console.log(`Linked ${linked} sinks to companies.`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
