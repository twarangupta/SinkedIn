// Vitest configuration for the backend.
//
// - environment: 'node' — services run in Node, not a browser DOM.
// - setupFiles: runs vitest.setup.ts before the test files, so the test
//   database connection string (.env.test) is loaded into process.env BEFORE
//   any test imports the Prisma client.
// - include: only *.test.ts files under src/ (the service layer is what we
//   unit-test) and prisma/.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts', 'prisma/**/*.test.ts'],
  },
});
