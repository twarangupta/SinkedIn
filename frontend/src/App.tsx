/**
 * Root component — routes on auth state.
 *
 * While the session is loading, show a minimal loading state. Then: signed in →
 * the app (HomePage); signed out → the AuthPage. Wrapped in AuthProvider by
 * main.tsx, so useAuth is available here.
 */

import { useAuth } from './lib/auth';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';

function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-3">
        Loading…
      </div>
    );
  }

  return session ? <HomePage /> : <AuthPage />;
}

export default App;
