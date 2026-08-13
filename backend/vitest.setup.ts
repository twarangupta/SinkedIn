// Test setup — runs once per test file, before the tests.
//
// Loads the TEST environment (.env.test) into process.env so every test talks
// to the isolated `sinkedin_test` database instead of the dev database. This
// must happen before the Prisma client is constructed (the client reads
// DATABASE_URL at import time), which is why it lives in a setupFile.

import { config } from 'dotenv';

// `override: true` ensures the test DB URL wins even if a dev .env was already
// loaded into the environment by some earlier import.
config({ path: '.env.test', override: true });
