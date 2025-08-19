import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://contractsonly.com'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/_next/',
          '/dashboard/',
          '/profile/settings/',
          '/applications/',
          '/notifications/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/jobs/',
          '/jobs/*',
          '/pricing',
          '/about',
          '/contact',
        ],
        disallow: [
          '/api/',
          '/admin/',
          '/_next/',
          '/dashboard/',
          '/profile/settings/',
          '/applications/',
          '/notifications/',
        ],
        crawlDelay: 1,
      },
    ],
    sitemap: [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/sitemap-jobs.xml`,
      `${baseUrl}/sitemap-profiles.xml`,
    ],
    host: baseUrl,
  }
}