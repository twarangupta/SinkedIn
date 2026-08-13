/**
 * Remove ALL demo (removable) data — run this when real users arrive so the
 * sample content never pollutes real data. Categories and real users are left
 * completely untouched (the purge is scoped to seed-prefixed users only; see
 * prisma/demo-data.ts).
 *
 * Run with:  npm run db:unseed:demo
 */

import { PrismaClient } from '@prisma/client';
import { purgeDemoData } from './demo-data.js';

const prisma = new PrismaClient();

async function main() {
  const removed = await purgeDemoData(prisma);
  // eslint-disable-next-line no-console
  console.log(
    `Removed demo data: ${removed.users} users and ${removed.sinks} sinks (and their votes/comments/polls). Categories untouched.`,
  );
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Demo unseed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
