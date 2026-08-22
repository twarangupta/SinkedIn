'use client';

/**
 * Auth form — sign in / sign up. Used inside the sign-in modal (public-first
 * model). Calls onSuccess after a successful sign in/up (to close the modal).
 */

import { useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

export function AuthForm({ onSuccess }: { onSuccess?: () => void }) {
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
      if (mode === 'signin') await signIn(email, password);
      else await signUp(email, password);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-5 text-center">
        <h1 className="font-display text-2xl font-bold">
          SinkedIn<span className="text-violet">.in</span>
        </h1>
        <p className="mt-1 text-sm text-ink-3">
          {mode === 'signin'
            ? 'Sign in to post, vote, and comment.'
            : "No real names. You'll get an anonymous handle."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <Input
          type="email"
          placeholder="you@email.com"
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
  );
}
