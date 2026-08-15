'use client';

/**
 * GA4 SPA page-view tracking. The base gtag tag (in layout) only fires on first
 * load; Next.js client navigation changes the URL without a reload, so we send
 * a page_view on every pathname change.
 */

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    window.gtag?.('event', 'page_view', {
      page_path: query ? `${pathname}?${query}` : pathname,
    });
  }, [pathname, searchParams]);

  return null;
}
