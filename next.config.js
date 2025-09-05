const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  
  // Enable experimental features for better performance
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      '@stripe/stripe-js',
      'date-fns'
    ],
  },


  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Performance optimizations
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },

  // Redirects for single-page website
  async redirects() {
    const singlePageMode = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'false'
    
    const baseRedirects = [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ]
    
    // If in single-page mode, redirect all routes to homepage except API routes
    const singlePageRedirects = singlePageMode ? [
      {
        source: '/jobs',
        destination: '/',
        permanent: false,
      },
      {
        source: '/jobs/:path*',
        destination: '/',
        permanent: false,
      },
      {
        source: '/dashboard',
        destination: '/',
        permanent: false,
      },
      {
        source: '/dashboard/:path*',
        destination: '/',
        permanent: false,
      },
      {
        source: '/profile',
        destination: '/',
        permanent: false,
      },
      {
        source: '/profile/:path*',
        destination: '/',
        permanent: false,
      },
      {
        source: '/sign-in',
        destination: '/',
        permanent: false,
      },
      {
        source: '/sign-in/:path*',
        destination: '/',
        permanent: false,
      },
      {
        source: '/sign-up',
        destination: '/',
        permanent: false,
      },
      {
        source: '/sign-up/:path*',
        destination: '/',
        permanent: false,
      },
      {
        source: '/onboarding',
        destination: '/',
        permanent: false,
      },
      {
        source: '/admin',
        destination: '/',
        permanent: false,
      },
      {
        source: '/admin/:path*',
        destination: '/',
        permanent: false,
      },
      {
        source: '/employer',
        destination: '/',
        permanent: false,
      },
      {
        source: '/employer/:path*',
        destination: '/',
        permanent: false,
      },
      {
        source: '/candidates',
        destination: '/',
        permanent: false,
      },
      {
        source: '/applications',
        destination: '/',
        permanent: false,
      },
      {
        source: '/applications/:path*',
        destination: '/',
        permanent: false,
      },
      {
        source: '/notifications',
        destination: '/',
        permanent: false,
      },
      {
        source: '/analytics',
        destination: '/',
        permanent: false,
      },
      {
        source: '/pricing',
        destination: '/',
        permanent: false,
      },
      {
        source: '/debug/:path*',
        destination: '/',
        permanent: false,
      },
    ] : []
    
    return [...baseRedirects, ...singlePageRedirects]
  },

  // Bundle analyzer (Turbopack compatible)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config, { dev, isServer }) => {
      if (!isServer && !dev) {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: '../bundle-analyzer-report.html',
          })
        )
      }
      return config
    },
  }),

  // Environment variables for performance monitoring and deployment
  env: {
    ANALYZE: process.env.ANALYZE,
    PERFORMANCE_MONITORING: process.env.NODE_ENV === 'development' ? 'true' : 'false',
    // Vercel deployment URLs for dynamic configuration
    VERCEL_URL: process.env.VERCEL_URL,
    NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
    VERCEL_ENV: process.env.VERCEL_ENV,
  },

  // TypeScript configuration
  typescript: {
    // Only run type checking in development and CI
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },

  // ESLint configuration
  eslint: {
    // Only run ESLint in development and CI
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
}

module.exports = nextConfig