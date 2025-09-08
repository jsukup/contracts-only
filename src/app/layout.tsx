import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProviderWrapper } from '@/components/providers/ClerkProviderWrapper';
import { Navigation } from "@/components/layout/Navigation";
import { Footer } from "@/components/layout/Footer";
import { WebSocketProvider } from "@/components/providers/WebSocketProvider";
import { PerformanceMonitor } from "@/components/performance/LazyComponents";
import MonitoringProvider from "@/components/monitoring/MonitoringProvider";
import { Suspense } from 'react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: '%s | ContractsOnly',
    default: 'ContractsOnly - Find Your Next Contract Job'
  },
  description: 'The premier platform for finding contract work and connecting with top talent. Browse thousands of freelance and contract opportunities.',
  keywords: 'contract jobs, freelance work, remote jobs, tech contracts, developer jobs',
  authors: [{ name: 'ContractsOnly Team' }],
  creator: 'ContractsOnly',
  publisher: 'ContractsOnly',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://contracts-only.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'ContractsOnly',
    title: 'ContractsOnly - Find Your Next Contract Job',
    description: 'The premier platform for finding contract work and connecting with top talent.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ContractsOnly - Contract Job Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ContractsOnly - Find Your Next Contract Job',
    description: 'The premier platform for finding contract work and connecting with top talent.',
    images: ['/twitter-image.png'],
    creator: '@contractsonly',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  other: {
    "lt-installed": "false"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-lt-installed="false">
      <head>
        {/* DNS Prefetch for external domains */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        <link rel="dns-prefetch" href="//api.stripe.com" />
        
        {/* Preconnect to critical domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#3b82f6" />
        <meta name="color-scheme" content="light" />
        
        {/* Viewport optimization for mobile */}
        <meta 
          name="viewport" 
          content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" 
        />
        
        {/* Favicon - ICO format for broad browser support */}
        <link rel="icon" href="/images/icons/favicon-16x16-dark.ico" type="image/x-icon" />
        
        {/* Modern favicon formats with theme support */}
        <link rel="icon" href="/images/icons/favicon-16x16-light.png" sizes="16x16" type="image/png" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/images/icons/favicon-32x32-light.png" sizes="32x32" type="image/png" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/images/icons/favicon-16x16-dark.png" sizes="16x16" type="image/png" media="(prefers-color-scheme: dark)" />
        <link rel="icon" href="/images/icons/favicon-32x32-dark.png" sizes="32x32" type="image/png" media="(prefers-color-scheme: dark)" />
        
        {/* Fallback favicons for browsers that don't support media queries */}
        <link rel="shortcut icon" href="/images/icons/favicon-16x16-light.png" type="image/png" />
        
        {/* Apple touch icons with theme support */}
        <link rel="apple-touch-icon" href="/images/icons/apple-touch-icon-light.png" media="(prefers-color-scheme: light)" />
        <link rel="apple-touch-icon" href="/images/icons/apple-touch-icon-dark.png" media="(prefers-color-scheme: dark)" />
        <link rel="apple-touch-icon" sizes="120x120" href="/images/icons/apple-touch-icon-light-120x120.png" media="(prefers-color-scheme: light)" />
        <link rel="apple-touch-icon" sizes="120x120" href="/images/icons/apple-touch-icon-dark-120x120.png" media="(prefers-color-scheme: dark)" />
        <link rel="apple-touch-icon" sizes="152x152" href="/images/icons/apple-touch-icon-light-152x152.png" media="(prefers-color-scheme: light)" />
        <link rel="apple-touch-icon" sizes="152x152" href="/images/icons/apple-touch-icon-dark-152x152.png" media="(prefers-color-scheme: dark)" />
        
        {/* Android Chrome icons */}
        <link rel="icon" href="/images/icons/android-chrome-192x192-light.png" sizes="192x192" type="image/png" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/images/icons/android-chrome-512x512-light.png" sizes="512x512" type="image/png" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/images/icons/android-chrome-192x192-dark.png" sizes="192x192" type="image/png" media="(prefers-color-scheme: dark)" />
        <link rel="icon" href="/images/icons/android-chrome-512x512-dark.png" sizes="512x512" type="image/png" media="(prefers-color-scheme: dark)" />
        
        {/* Manifest for PWA */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Structured data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "ContractsOnly",
              "url": process.env.NEXT_PUBLIC_APP_URL || "https://contracts-only.com",
              "description": "The premier platform for finding contract work and connecting with top talent",
              "potentialAction": {
                "@type": "SearchAction",
                "target": `${process.env.NEXT_PUBLIC_APP_URL || "https://contracts-only.com"}/jobs?search={search_term_string}`,
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                window.__NEXT_HYDRATE_CB = null;
                document.documentElement.setAttribute('data-lt-installed', 'false');
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
        suppressHydrationWarning
        data-lt-installed="false"
      >
        <ClerkProviderWrapper>
          <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          }>
            <MonitoringProvider>
              <WebSocketProvider>
                <div className="relative flex min-h-screen flex-col">
                  <Navigation />
                  <main className="flex-1">
                    {children}
                  </main>
                  <Footer />
                </div>
                
                {/* Performance monitoring in development */}
                {process.env.NODE_ENV === 'development' && <PerformanceMonitor />}
              </WebSocketProvider>
            </MonitoringProvider>
          </Suspense>
        </ClerkProviderWrapper>
        
        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-NLD9BB69ZV"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-NLD9BB69ZV');
            `,
          }}
        />
      </body>
    </html>
  );
}
