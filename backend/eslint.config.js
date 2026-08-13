// ESLint configuration (flat config — the modern `eslint.config.js` format
// used by ESLint 9+). Replaces the older `.eslintrc` files.
//
// Layers, in order:
//   1. Ignore build output and dependencies.
//   2. ESLint's recommended JS rules.
//   3. typescript-eslint's recommended TypeScript rules.
//   4. A small project-specific tweak block.
//   5. eslint-config-prettier LAST, to disable all purely-stylistic rules so
//      Prettier alone owns formatting (prevents the two tools fighting).

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  // 1. Never lint compiled output or dependencies.
  { ignores: ['dist/**', 'node_modules/**'] },

  // 2 + 3. Recommended rule sets for JS and TypeScript.
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 4. Project-specific adjustments.
  {
    rules: {
      // Warn (don't error) on stray console.* — a startup banner is fine, but
      // debug logging shouldn't silently ship to production.
      'no-console': 'warn',
      // Allow intentionally-unused args/vars when prefixed with `_`
      // (e.g. `(_req, res)` when the request object isn't needed).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // 5. Turn off formatting rules — Prettier handles those. Must be last.
  eslintConfigPrettier,
);
