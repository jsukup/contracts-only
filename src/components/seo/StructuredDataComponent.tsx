// Component for adding structured data to pages
// Renders JSON-LD structured data for better SEO

'use client'

import { useEffect } from 'react'

interface StructuredDataProps {
  data: object | object[]
  key?: string
}

export function StructuredDataComponent({ data, key }: StructuredDataProps) {
  useEffect(() => {
    // Clean up any existing structured data scripts with the same key
    if (key) {
      const existingScript = document.querySelector(`script[data-structured-data="${key}"]`)
      if (existingScript) {
        existingScript.remove()
      }
    }

    // Create new script element
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(Array.isArray(data) ? data : [data])
    
    if (key) {
      script.setAttribute('data-structured-data', key)
    }
    
    // Add to document head
    document.head.appendChild(script)

    // Cleanup function
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [data, key])

  // This component doesn't render anything visible
  return null
}

// Server-side structured data component for static rendering
export function StaticStructuredData({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(Array.isArray(data) ? data : [data])
      }}
    />
  )
}

// Breadcrumb component with structured data
export function BreadcrumbsWithStructuredData({ 
  items 
}: { 
  items: Array<{ name: string; url: string }> 
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${process.env.NEXT_PUBLIC_APP_URL || 'https://contractsonly.com'}${item.url}`,
    })),
  }

  return (
    <>
      <nav aria-label="Breadcrumb" className="flex mb-4">
        <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
          {items.map((item, index) => (
            <li key={item.url} className="flex items-center">
              {index > 0 && <span className="mx-2">/</span>}
              {index === items.length - 1 ? (
                <span className="text-foreground font-medium">{item.name}</span>
              ) : (
                <a 
                  href={item.url} 
                  className="hover:text-foreground transition-colors"
                >
                  {item.name}
                </a>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <StructuredDataComponent data={structuredData} key="breadcrumbs" />
    </>
  )
}

// FAQ component with structured data
export function FAQWithStructuredData({ 
  faqs 
}: { 
  faqs: Array<{ question: string; answer: string }> 
}) {
  const structuredData = {
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

  return (
    <>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b pb-4 last:border-b-0">
              <h3 className="font-semibold text-lg mb-2">{faq.question}</h3>
              <p className="text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
      <StructuredDataComponent data={structuredData} key="faq" />
    </>
  )
}

// Review/Rating component with structured data
export function ReviewsWithStructuredData({
  reviews,
  aggregateRating
}: {
  reviews: Array<{
    author: string
    rating: number
    reviewBody: string
    datePublished: string
  }>
  aggregateRating?: {
    ratingValue: number
    ratingCount: number
    bestRating?: number
    worstRating?: number
  }
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product', // Or Organization, Service, etc.
    name: 'ContractsOnly Platform',
    review: reviews.map(review => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: review.author,
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      },
      reviewBody: review.reviewBody,
      datePublished: review.datePublished,
    })),
    ...(aggregateRating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: aggregateRating.ratingValue,
        ratingCount: aggregateRating.ratingCount,
        bestRating: aggregateRating.bestRating || 5,
        worstRating: aggregateRating.worstRating || 1,
      }
    })
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Reviews</h2>
          {aggregateRating && (
            <div className="text-right">
              <div className="text-2xl font-bold">{aggregateRating.ratingValue}/5</div>
              <div className="text-sm text-muted-foreground">
                {aggregateRating.ratingCount} reviews
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          {reviews.map((review, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{review.author}</h3>
                <div className="flex items-center">
                  <span className="text-yellow-500 mr-1">★</span>
                  <span>{review.rating}/5</span>
                </div>
              </div>
              <p className="text-muted-foreground mb-2">{review.reviewBody}</p>
              <div className="text-xs text-muted-foreground">
                {new Date(review.datePublished).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
      <StructuredDataComponent data={structuredData} key="reviews" />
    </>
  )
}