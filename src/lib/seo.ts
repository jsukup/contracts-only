// SEO utilities and structured data for ContractsOnly
// Implements comprehensive SEO optimization features

import { Metadata } from 'next'

export interface SEOConfig {
  title: string
  description: string
  keywords?: string[]
  image?: string
  url?: string
  type?: 'website' | 'article' | 'profile'
  publishedTime?: string
  modifiedTime?: string
  author?: string
  siteName?: string
}

// Generate comprehensive metadata for pages
export function generateMetadata(config: SEOConfig): Metadata {
  const {
    title,
    description,
    keywords = [],
    image = '/og-image.png',
    url = '',
    type = 'website',
    publishedTime,
    modifiedTime,
    author,
    siteName = 'ContractsOnly'
  } = config

  const fullTitle = title.includes('ContractsOnly') ? title : `${title} | ContractsOnly`
  const fullUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://contracts-only.com'}${url}`
  const fullImage = image.startsWith('http') ? image : `${process.env.NEXT_PUBLIC_APP_URL || 'https://contracts-only.com'}${image}`

  return {
    title: fullTitle,
    description,
    keywords: keywords.join(', '),
    authors: author ? [{ name: author }] : [{ name: 'ContractsOnly Team' }],
    creator: 'ContractsOnly',
    publisher: 'ContractsOnly',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://contracts-only.com'),
    alternates: {
      canonical: fullUrl,
    },
    openGraph: {
      type: type as any,
      locale: 'en_US',
      url: fullUrl,
      siteName,
      title: fullTitle,
      description,
      images: [
        {
          url: fullImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(author && { authors: [author] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [fullImage],
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
  }
}

// Structured data generators
export class StructuredData {
  // Organization structured data
  static organization() {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'ContractsOnly',
      url: process.env.NEXT_PUBLIC_APP_URL || 'https://contracts-only.com',
      logo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://contracts-only.com'}/logo.png`,
      description: 'The premier platform for finding contract work and connecting with top talent',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'US',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: 'support@contracts-only.com',
      },
      sameAs: [
        'https://twitter.com/contractsonly',
        'https://linkedin.com/company/contractsonly',
      ],
    }
  }

  // Website structured data
  static website() {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'ContractsOnly',
      url: process.env.NEXT_PUBLIC_APP_URL || 'https://contracts-only.com',
      description: 'Find your next contract job or hire top freelance talent',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${process.env.NEXT_PUBLIC_APP_URL || 'https://contracts-only.com'}/jobs?search={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    }
  }

  // Job posting structured data
  static jobPosting(job: any) {
    return {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: job.title,
      description: job.description,
      identifier: {
        '@type': 'PropertyValue',
        name: 'ContractsOnly Job ID',
        value: job.id,
      },
      datePosted: job.createdAt,
      validThrough: job.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      employmentType: job.type || 'CONTRACT',
      hiringOrganization: {
        '@type': 'Organization',
        name: job.company || 'ContractsOnly Employer',
        sameAs: process.env.NEXT_PUBLIC_APP_URL || 'https://contracts-only.com',
      },
      jobLocation: job.location
        ? {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              addressLocality: job.location,
            },
          }
        : {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              addressCountry: 'US',
            },
          },
      baseSalary: job.hourlyRateMin && job.hourlyRateMax
        ? {
            '@type': 'MonetaryAmount',
            currency: 'USD',
            value: {
              '@type': 'QuantitativeValue',
              minValue: job.hourlyRateMin,
              maxValue: job.hourlyRateMax,
              unitText: 'HOUR',
            },
          }
        : undefined,
      workHours: job.hoursPerWeek ? `${job.hoursPerWeek} hours per week` : undefined,
      skills: job.skills?.map((skill: any) => skill.name) || [],
      qualifications: job.requirements || [],
      responsibilities: job.description,
      applicantLocationRequirements: job.isRemote
        ? {
            '@type': 'Country',
            name: 'US',
          }
        : undefined,
    }
  }

  // Person/Profile structured data
  static person(profile: any) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: profile.name,
      jobTitle: profile.title || 'Freelance Professional',
      description: profile.bio,
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://contracts-only.com'}/profile/${profile.id}`,
      image: profile.image,
      knowsAbout: profile.skills?.map((skill: any) => skill.name) || [],
      worksFor: {
        '@type': 'Organization',
        name: 'ContractsOnly Network',
      },
      hasOccupation: {
        '@type': 'Occupation',
        name: profile.title || 'Freelance Professional',
        skills: profile.skills?.map((skill: any) => skill.name) || [],
      },
    }
  }

  // Breadcrumb structured data
  static breadcrumb(items: Array<{ name: string; url: string }>) {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: `${process.env.NEXT_PUBLIC_APP_URL || 'https://contracts-only.com'}${item.url}`,
      })),
    }
  }

  // FAQ structured data
  static faq(faqs: Array<{ question: string; answer: string }>) {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    }
  }

  // Article structured data
  static article(article: {
    title: string
    description: string
    author: string
    publishedAt: string
    modifiedAt?: string
    image?: string
    url: string
  }) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.description,
      author: {
        '@type': 'Person',
        name: article.author,
      },
      publisher: {
        '@type': 'Organization',
        name: 'ContractsOnly',
        logo: {
          '@type': 'ImageObject',
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://contracts-only.com'}/logo.png`,
        },
      },
      datePublished: article.publishedAt,
      dateModified: article.modifiedAt || article.publishedAt,
      image: article.image || `${process.env.NEXT_PUBLIC_APP_URL || 'https://contracts-only.com'}/og-image.png`,
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://contracts-only.com'}${article.url}`,
    }
  }
}

// SEO analysis and recommendations
export class SEOAnalyzer {
  static analyzeContent(content: string) {
    const wordCount = content.split(/\s+/).length
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const avgWordsPerSentence = wordCount / sentences.length

    return {
      wordCount,
      sentenceCount: sentences.length,
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
      readabilityScore: this.calculateReadabilityScore(content),
      recommendations: this.generateRecommendations(wordCount, avgWordsPerSentence),
    }
  }

  private static calculateReadabilityScore(content: string): number {
    // Simplified Flesch Reading Ease calculation
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length
    const words = content.split(/\s+/).length
    const syllables = this.countSyllables(content)

    if (sentences === 0 || words === 0) return 0

    return Math.max(0, Math.min(100, 
      206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words))
    ))
  }

  private static countSyllables(text: string): number {
    return text.toLowerCase()
      .replace(/[^a-z]/g, '')
      .replace(/[aeiouy]+/g, 'a')
      .replace(/a$/, '')
      .length || 1
  }

  private static generateRecommendations(wordCount: number, avgWordsPerSentence: number): string[] {
    const recommendations: string[] = []

    if (wordCount < 300) {
      recommendations.push('Consider adding more content (aim for 300+ words for better SEO)')
    }

    if (wordCount > 2000) {
      recommendations.push('Content is quite long - consider breaking into sections with headers')
    }

    if (avgWordsPerSentence > 20) {
      recommendations.push('Sentences are long - consider breaking them up for better readability')
    }

    if (avgWordsPerSentence < 10) {
      recommendations.push('Sentences are very short - consider combining some for better flow')
    }

    return recommendations
  }
}

// Sitemap generation utilities
export class SitemapGenerator {
  static generateSitemap(pages: Array<{
    url: string
    lastModified?: Date
    changeFreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
    priority?: number
  }>) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://contracts-only.com'
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${(page.lastModified || new Date()).toISOString().split('T')[0]}</lastmod>
    <changefreq>${page.changeFreq || 'weekly'}</changefreq>
    <priority>${page.priority || 0.5}</priority>
  </url>`).join('\n')}
</urlset>`
  }

  static generateRobotsTxt() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://contracts-only.com'
    
    return `User-agent: *
Allow: /

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/sitemap-jobs.xml
Sitemap: ${baseUrl}/sitemap-profiles.xml

# Disallow admin and API routes
Disallow: /api/
Disallow: /admin/
Disallow: /_next/
Disallow: /dashboard/
Disallow: /profile/settings/

# Allow specific API endpoints for SEO
Allow: /api/jobs/sitemap
Allow: /api/profiles/sitemap

# Crawl delay (optional)
Crawl-delay: 1`
  }
}

// Meta tag helpers
export function generateCanonicalUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://contracts-only.com'
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

export function generateHrefLangs(path: string, locales: string[] = ['en']): Array<{ hrefLang: string; href: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://contracts-only.com'
  
  return locales.map(locale => ({
    hrefLang: locale,
    href: `${baseUrl}${locale === 'en' ? '' : `/${locale}`}${path}`
  }))
}