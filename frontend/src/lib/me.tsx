'use client';

/**
 * Me — the signed-in user's own public record (handle + avatar), fetched ONCE
 * and shared. Previously the Header, the composer, and Settings each fetched
 * /users/me independently (two duplicate calls on the feed alone). This mirrors
 * MyVotesProvider: one fetch on sign-in, exposed via useMe(). `setMe` lets a
 * mutation (e.g. changing your avatar in Settings) update the header live,
 * without a reload.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './auth';
import { apiFetch } from './api';
import type { PublicUser } from '../types';

interface MeValue {
  me: PublicUser | undefined;
  /** True once the fetch has settled (so consumers can tell "loading" from "signed out"). */
  loaded: boolean;
  setMe: (user: PublicUser) => void;
}

const MeContext = createContext<MeValue>({
  me: undefined,
  loaded: false,
  setMe: () => {},
});

export function MeProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [me, setMe] = useState<PublicUser>();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!session) {
      setMe(undefined);
      setLoaded(true);
      return;
    }
    let cancelled = false;
    setLoaded(false);
    apiFetch<{ user: PublicUser }>('/api/v1/users/me')
      .then((res) => {
        if (!cancelled) {
          setMe(res.user);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  return (
    <MeContext.Provider value={{ me, loaded, setMe }}>
      {children}
    </MeContext.Provider>
  );
}

export function useMe(): MeValue {
  return useContext(MeContext);
}
