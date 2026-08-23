/**
 * /tracker — the job tracker page.
 *
 * SEO pattern: this server component renders a PUBLIC marketing hero (real HTML,
 * metadata, JSON-LD) that crawlers index and can rank for "free job application
 * tracker". The actual private tracker (<TrackerApp/>) hydrates client-side and
 * only shows data to the signed-in owner, so real application PII never appears
 * in the server-rendered HTML and is never indexed. The auth gate sits before
 * any private data renders.
 */

import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { TrackerHero } from '@/components/tracker/TrackerHero';

export const metadata: Metadata = {
  title: 'Free Job Application Tracker · SinkedIn',
  description:
    'A free, private job application tracker. Track every application, online assessment, interview, and offer in one place. No spreadsheets, no card required.',
  openGraph: {
    title: 'Free Job Application Tracker · SinkedIn',
    description:
      'Track every application, assessment, interview, and offer in one private place. Free.',
    type: 'website',
  },
  alternates: { canonical: '/tracker' },
};

// JSON-LD so search engines understand this is a free web application.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'SinkedIn Job Tracker',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'A free, private job application tracker for the real job hunt. Track applications, assessments, interviews, and offers.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};

export default function TrackerPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <TrackerHero />
      </div>
    </div>
  );
}
