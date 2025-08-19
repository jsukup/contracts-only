import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://contractsonly.com'
    
    // Get public user profiles for sitemap
    // Note: Only include profiles that users have explicitly made public
    const users = await prisma.user.findMany({
      where: {
        // Add a public profile field to your schema if you want this feature
        // isPublic: true
        name: {
          not: null // Only include users with names (basic public info)
        }
      },
      select: {
        id: true,
        updatedAt: true,
      },
      take: 10000, // Limit to prevent too large sitemap
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // Generate XML sitemap for public profiles
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${users.map(user => `  <url>
    <loc>${baseUrl}/profile/${user.id}</loc>
    <lastmod>${user.updatedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`).join('\n')}
</urlset>`

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 24 hours
      },
    })
  } catch (error) {
    console.error('Error generating profiles sitemap:', error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }
}