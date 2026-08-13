/**
 * Frontend entry point.
 *
 * Finds the <div id="root"> in index.html and mounts the React app into it.
 * This is the single bridge between the static HTML page and the React world;
 * everything visible is rendered from <App /> downward.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './lib/auth';
import './index.css';

// The "!" tells TypeScript we're certain #root exists (it's in index.html).
const rootElement = document.getElementById('root')!;

createRoot(rootElement).render(
  // StrictMode is a dev-only helper: it double-invokes certain functions to
  // surface accidental side effects and unsafe patterns early. It renders
  // nothing itself and is stripped from the production build.
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
