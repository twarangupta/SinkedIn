/** Fetches the public feed of Sinks, with a refresh() to re-pull after posting. */

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import type { Sink } from '../types';

export function useFeed() {
  const [sinks, setSinks] = useState<Sink[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ sinks: Sink[] }>('/api/v1/sinks');
      setSinks(res.sinks);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sinks, loading, refresh };
}
