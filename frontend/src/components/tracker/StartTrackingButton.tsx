'use client';

/**
 * StartTrackingButton — the hero CTA. Client so it knows auth state: signed-out
 * opens the sign-in modal; signed-in scrolls down to the tracker app. Lets the
 * hero itself stay a server component (indexable).
 */

import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { useAuthModal } from '../../lib/authModal';
import { Button } from '../ui/Button';

export function StartTrackingButton() {
  const { session } = useAuth();
  const { open } = useAuthModal();
  const router = useRouter();

  // Signed in → open the actual tracker app (its own page). Signed out → sign-in
  // modal; after auth they land back here and can enter the app.
  if (session) {
    return <Button onClick={() => router.push('/tracker/app')}>Go to your tracker</Button>;
  }
  return <Button onClick={() => open()}>Start tracking, it&apos;s free</Button>;
}
