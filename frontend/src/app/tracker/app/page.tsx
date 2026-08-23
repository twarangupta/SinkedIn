/**
 * /tracker/app — the PRIVATE job tracker application (its own page, separate
 * from the public /tracker landing).
 *
 * noindex: this page is the app, not marketing — only the /tracker landing
 * should be indexed. All data is fetched client-side with the JWT inside
 * <TrackerApp/>, so no private data is ever server-rendered here anyway.
 */

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { TrackerApp } from '@/components/tracker/TrackerApp';

export const metadata: Metadata = {
  title: 'Your Job Tracker · SinkedIn',
  robots: { index: false, follow: false },
};

export default function TrackerAppPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-[92rem] px-4 py-8 sm:px-6">
        <Suspense fallback={null}>
          <TrackerApp />
        </Suspense>
      </div>
    </div>
  );
}
