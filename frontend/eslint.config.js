// ESLint flat config for the frontend (React + TypeScript).
//
// Same layering idea as the backend, plus two React-specific plugins:
//   - react-hooks: enforces the Rules of Hooks (correctness, not style).
//   - react-refresh: warns about patterns that break Fast Refresh in dev.
// eslint-config-prettier comes LAST so Prettier owns all formatting.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  // Never lint build output or dependencies.
  { ignores: ['dist/**', 'node_modules/**'] },

  // Recommended JS + TypeScript rules, applied to source files.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      // Tell ESLint this code runs in the browser (so `window`, `document`,
      // etc. are known globals and not flagged as undefined).
      globals: {
        window: 'readonly',
        document: 'readonly',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Enforce the Rules of Hooks.
      ...reactHooks.configs.recommended.rules,
      // Components should be the only export in a file for Fast Refresh.
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Disable stylistic rules — Prettier handles formatting. Must be last.
  eslintConfigPrettier,
);
