/**
 * Top header bar — wordmark (links home), search (stub), and the auth area.
 * Fetches the current user's handle itself, so any page can just render <Header/>.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useAuthModal } from '../../lib/authModal';
import { apiFetch } from '../../lib/api';
import { Button } from '../ui/Button';

export function Header() {
  const { session, signOut } = useAuth();
  const { open } = useAuthModal();
  const [handle, setHandle] = useState<string>();

  useEffect(() => {
    if (!session) {
      setHandle(undefined);
      return;
    }
    apiFetch<{ user: { handle: string } }>('/api/v1/users/me')
      .then((res) => setHandle(res.user.handle))
      .catch(() => undefined);
  }, [session]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-6">
        <Link to="/" className="w-52 shrink-0">
          <span className="font-display text-xl font-bold">
            SinkedIn<span className="text-violet">.in</span>
          </span>
        </Link>
        <input
          placeholder="Search Sinks, categories, people…"
          className="hidden h-10 flex-1 rounded-lg border border-line bg-elevated px-3 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-primary md:block"
        />
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <span className="text-sm text-ink-2">{handle ?? '…'}</span>
              <Button variant="ghost" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <Button onClick={open}>Sign in</Button>
          )}
        </div>
      </div>
    </header>
  );
}
