/**
 * Auth screen — sign in / sign up, in the dark "into the deep" theme.
 *
 * Toggles between the two modes. On submit, calls the auth context (Supabase).
 * Includes the spec's anonymity nudge. On success, the AuthProvider's session
 * updates and App swaps this screen for the app.
 */

import { useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold">
            Sinked<span className="text-violet">.in</span>
          </h1>
          <p className="mt-1 text-sm text-ink-3">The real side of the job hunt.</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="mb-1 text-lg font-medium">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </h2>
          <p className="mb-5 text-sm text-ink-3">
            Pick something anonymous — this is public.
          </p>

          <form onSubmit={onSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy
                ? 'Working…'
                : mode === 'signin'
                  ? 'Sign in'
                  : 'Create account'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-ink-3">
            {mode === 'signin' ? 'New here? ' : 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
              }}
              className="text-primary hover:underline"
            >
              {mode === 'signin' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
