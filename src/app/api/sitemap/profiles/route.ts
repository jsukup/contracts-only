import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://contractsonly.com'
    const supabase = createServerSupabaseClient()
    
    // Get all profiles with bio (indicating they want to be discoverable)
    const { data: users } = await supabase
      .from('users')
      .select('id, updated_at')
      .not('bio', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(10000) // Limit to prevent too large sitemap

    // Generate XML sitemap for profiles
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${users?.map(user => `  <url>
    <loc>${baseUrl}/profile/${user.id}</loc>
    <lastmod>${new Date(user.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`).join('\n') || ''}
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