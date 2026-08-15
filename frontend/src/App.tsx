/**
 * Root component — PUBLIC-FIRST, with per-Sink routes.
 *
 * The app renders for everyone; no login wall. The AuthModal overlays on demand
 * when a logged-out user triggers a gated action. Routes:
 *   /       → feed
 *   /s/:id  → single Sink (shareable, SEO-friendly URL)
 */

import { Routes, Route } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { HomePage } from './pages/HomePage';
import { SinkDetailPage } from './pages/SinkDetailPage';
import { AuthModal } from './components/AuthModal';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-3">
        Loading…
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/s/:id" element={<SinkDetailPage />} />
      </Routes>
      <AuthModal />
    </>
  );
}

export default App;
