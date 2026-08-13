// Vite configuration — the frontend build tool and dev server.
//
// Vite gives us a fast dev server with instant Hot Module Replacement (HMR)
// and an optimized production bundle. The React plugin adds JSX handling and
// Fast Refresh (component state survives edits during development).

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev server port. 5173 is Vite's default; set explicitly so it's obvious
    // and doesn't collide with the backend (which runs on 4000).
    port: 5173,
  },
});
