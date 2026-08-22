/**
 * Root layout — wraps every page. Loads fonts + GA4, mounts the client
 * providers, and sets the default document metadata (title/description/OG).
 */

import type { Metadata } from 'next';
import { Suspense } from 'react';
import Script from 'next/script';
import { Providers } from '../components/Providers';
import { Analytics } from '../components/Analytics';
import { TopLoader } from '../components/TopLoader';
import './globals.css';

export const metadata: Metadata = {
  title: 'SinkedIn',
  description:
    'The honest, darkly-funny side of work and the job market. Bad bosses, burnout, rejections, wins, posted anonymously.',
  openGraph: {
    title: 'SinkedIn',
    description:
      'The honest, darkly-funny side of work and the job market, posted anonymously.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Suspense fallback={null}>
          <TopLoader />
        </Suspense>
        <Providers>{children}</Providers>
        <Analytics />

        {/* Google Analytics 4 */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-NQGVS7VTS1"
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-NQGVS7VTS1');
          `}
        </Script>
      </body>
    </html>
  );
}
