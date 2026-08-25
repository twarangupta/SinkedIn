'use client';

/**
 * Settings — currently just the avatar picker (account/email/delete come in a
 * later phase). Client component: needs auth + interactivity. Signed-out users
 * get a nudge to sign in. Picking an avatar stages a choice; a Save button
 * commits it (PATCH /users/me).
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useAuthModal } from '../../lib/authModal';
import { useMe } from '../../lib/me';
import { apiFetch } from '../../lib/api';
import { Header } from '../../components/layout/Header';
import { Avatar } from '../../components/avatar/Avatar';
import { AVATAR_CATALOG, avatarName } from '../../components/avatar/catalog';
import { PageHeader } from '../../components/PageHeader';
import { HandlePicker } from '../../components/HandlePicker';
import { ExportData } from '../../components/settings/ExportData';
import { Button } from '../../components/ui/Button';

export default function SettingsPage() {
  const { session } = useAuth();
  const { open } = useAuthModal();
  const { me, setMe } = useMe();
  const [selected, setSelected] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Stage the pending choice from the loaded user (once).
  useEffect(() => {
    if (me && selected === undefined) setSelected(me.avatarId);
  }, [me, selected]);

  const dirty = !!me && !!selected && selected !== me.avatarId;

  const save = async () => {
    if (!me || !selected || !dirty || saving) return;
    setSaving(true);
    setSaved(false);
    try {
      await apiFetch('/api/v1/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ avatarId: selected }),
      });
      setMe({ ...me, avatarId: selected });
      setSaved(true);
    } catch {
      // Leave the selection so the user can retry.
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-2xl space-y-4 px-6 py-6">
        <PageHeader title="Settings" />

        {!session ? (
          <div className="rounded-xl border border-line bg-surface p-6 text-center">
            <p className="mb-4 text-sm text-ink-2">Sign in to pick your creature.</p>
            <Button onClick={() => open()}>Sign in</Button>
          </div>
        ) : (
          <>
            <HandlePicker />
            <section className="space-y-4 rounded-xl border border-line bg-surface p-5">
              <div className="flex items-center gap-3">
                <Avatar avatarId={selected} handle={me?.handle ?? '::'} size={56} />
              <div>
                <div className="text-sm font-medium">{me?.handle ?? '…'}</div>
                <div className="text-xs text-ink-3">
                  You are the {avatarName(selected)}
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-medium text-ink-2">
                Pick your avatar
              </h2>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                {AVATAR_CATALOG.map((a) => {
                  const isSelected = a.id === selected;
                  return (
                    <button
                      key={a.id}
                      onClick={() => {
                        setSelected(a.id);
                        setSaved(false);
                      }}
                      title={a.name}
                      aria-label={a.name}
                      aria-pressed={isSelected}
                      className={`flex flex-col items-center gap-1 rounded-lg p-1.5 transition-colors ${
                        isSelected
                          ? 'bg-primary/15 ring-2 ring-primary'
                          : 'hover:bg-elevated'
                      }`}
                    >
                      <Avatar avatarId={a.id} handle={a.name} size={44} />
                      <span
                        className={`w-full truncate text-center text-xs leading-tight ${
                          isSelected ? 'text-ink' : 'text-ink-2'
                        }`}
                      >
                        {a.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              {saved && !dirty && (
                <span className="text-xs text-ink-3">Saved.</span>
              )}
              {dirty && (
                <span className="text-xs text-ink-3">Unsaved changes.</span>
              )}
              <Button size="sm" onClick={save} disabled={!dirty || saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
            </section>
            <ExportData />
          </>
        )}
      </div>
    </div>
  );
}
