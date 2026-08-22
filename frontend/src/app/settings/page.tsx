'use client';

/**
 * Settings — currently just the avatar picker (account/email/delete come in a
 * later phase). Client component: needs auth + interactivity. Signed-out users
 * get a nudge to sign in. Picking an avatar PATCHes /users/me optimistically.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useAuthModal } from '../../lib/authModal';
import { apiFetch } from '../../lib/api';
import { Header } from '../../components/layout/Header';
import { Avatar } from '../../components/avatar/Avatar';
import { AVATAR_CATALOG, avatarName } from '../../components/avatar/catalog';
import { Button } from '../../components/ui/Button';
import type { PublicUser } from '../../types';

export default function SettingsPage() {
  const { session } = useAuth();
  const { open } = useAuthModal();
  const [me, setMe] = useState<PublicUser>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) {
      setMe(undefined);
      return;
    }
    apiFetch<{ user: PublicUser }>('/api/v1/users/me')
      .then((res) => setMe(res.user))
      .catch(() => undefined);
  }, [session]);

  const choose = async (avatarId: string) => {
    if (!me || saving || avatarId === me.avatarId) return;
    const previous = me.avatarId;
    setMe({ ...me, avatarId }); // optimistic
    setSaving(true);
    try {
      await apiFetch('/api/v1/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ avatarId }),
      });
    } catch {
      setMe({ ...me, avatarId: previous }); // revert on failure
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-2xl space-y-6 px-6 py-6">
        <h1 className="font-display text-xl font-medium">Settings</h1>

        {!session ? (
          <div className="rounded-xl border border-line bg-surface p-6 text-center">
            <p className="mb-4 text-sm text-ink-2">
              Sign in to pick your creature.
            </p>
            <Button onClick={open}>Sign in</Button>
          </div>
        ) : (
          <section className="space-y-4 rounded-xl border border-line bg-surface p-5">
            <div className="flex items-center gap-3">
              <Avatar
                avatarId={me?.avatarId}
                handle={me?.handle ?? '::'}
                size={56}
              />
              <div>
                <div className="text-sm font-medium">{me?.handle ?? '…'}</div>
                <div className="text-xs text-ink-3">
                  You are the {avatarName(me?.avatarId)}
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-medium text-ink-2">
                Pick your avatar
              </h2>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                {AVATAR_CATALOG.map((a) => {
                  const selected = a.id === me?.avatarId;
                  return (
                    <button
                      key={a.id}
                      onClick={() => choose(a.id)}
                      title={a.name}
                      aria-label={a.name}
                      aria-pressed={selected}
                      className={`flex flex-col items-center gap-1 rounded-lg p-1.5 transition-colors ${
                        selected
                          ? 'bg-primary/15 ring-2 ring-primary'
                          : 'hover:bg-elevated'
                      }`}
                    >
                      <Avatar avatarId={a.id} handle={a.name} size={44} />
                      <span
                        className={`w-full truncate text-center text-xs leading-tight ${
                          selected ? 'text-ink' : 'text-ink-2'
                        }`}
                      >
                        {a.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
