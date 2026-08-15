'use client';

/**
 * GA4 SPA page-view tracking. The base gtag tag (in layout) only fires on first
 * load; Next.js client navigation changes the URL without a reload, so we send
 * a page_view on every pathname change.
 *
 * Uses only usePathname (not useSearchParams) so it doesn't force the whole
 * route to client-render — SSR stays intact.
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    window.gtag?.('event', 'page_view', { page_path: pathname });
  }, [pathname]);

  return null;
}
