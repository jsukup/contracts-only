import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://contractsonly.com'
    
    // Get all active job postings for sitemap
    const jobs = await prisma.job.findMany({
      where: {
        isActive: true,
        expiresAt: {
          gt: new Date() // Only include non-expired jobs
        }
      },
      select: {
        id: true,
        updatedAt: true,
        createdAt: true,
      },
      take: 50000, // Limit to prevent too large sitemap
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // Generate XML sitemap for jobs
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${jobs.map(job => `  <url>
    <loc>${baseUrl}/jobs/${job.id}</loc>
    <lastmod>${job.updatedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>`

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error('Error generating jobs sitemap:', error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }
}