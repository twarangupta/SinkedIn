/**
 * Root component — PUBLIC-FIRST.
 *
 * The app (feed) renders for everyone; there's no login wall. The AuthModal
 * overlays on demand when a logged-out user triggers a gated action.
 */

import { useAuth } from './lib/auth';
import { HomePage } from './pages/HomePage';
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
      <HomePage />
      <AuthModal />
    </>
  );
}

export default App;
