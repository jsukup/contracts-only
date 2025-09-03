import { NextRequest, NextResponse } from 'next/server'
import { MarketingEmailEngine, MarketingEmailType, MarketingCampaign } from '@/lib/email/marketing'

export async function POST(request: NextRequest) {
  try {
    // Basic authentication - in production, this should be more robust
    const authHeader = request.headers.get('authorization')
    const adminSecret = process.env.ADMIN_SECRET || 'admin-secret'
    
    if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' }, 
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      name, 
      subject, 
      templateType, 
      targetAudience, 
      data,
      executeNow = false 
    } = body

    // Validate required fields
    if (!name || !subject || !templateType || !targetAudience) {
      return NextResponse.json(
        { error: 'Missing required fields: name, subject, templateType, targetAudience' },
        { status: 400 }
      )
    }

    // Validate template type
    if (!Object.values(MarketingEmailType).includes(templateType)) {
      return NextResponse.json(
        { error: 'Invalid template type', validTypes: Object.values(MarketingEmailType) },
        { status: 400 }
      )
    }

    // Validate target audience
    const validAudiences = ['all', 'contractors', 'recruiters', 'inactive']
    if (!validAudiences.includes(targetAudience)) {
      return NextResponse.json(
        { error: 'Invalid target audience', validAudiences },
        { status: 400 }
      )
    }

    // Create campaign object
    const campaign: MarketingCampaign = {
      id: `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      subject,
      templateType: templateType as MarketingEmailType,
      targetAudience,
      data: data || {},
      status: executeNow ? 'sending' : 'draft'
    }

    console.log(`[Marketing API] Created campaign: ${campaign.name}`)

    if (executeNow) {
      // Execute campaign immediately
      console.log(`[Marketing API] Executing campaign immediately: ${campaign.name}`)
      
      const result = await MarketingEmailEngine.sendMarketingCampaign(campaign)
      
      return NextResponse.json({
        success: true,
        message: 'Marketing campaign executed successfully',
        campaign: {
          ...campaign,
          status: 'sent'
        },
        results: result
      })
    } else {
      // Save as draft (in a real system, this would be saved to database)
      console.log(`[Marketing API] Campaign saved as draft: ${campaign.name}`)
      
      return NextResponse.json({
        success: true,
        message: 'Marketing campaign saved as draft',
        campaign,
        note: 'To execute this campaign, send a POST request to /api/marketing/campaigns/execute with the campaign ID'
      })
    }

  } catch (error) {
    console.error('[Marketing API] Error processing campaign:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process marketing campaign',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint for campaign templates and examples
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const examples = searchParams.get('examples') === 'true'
  
  if (examples) {
    return NextResponse.json({
      message: 'Marketing campaign examples and templates',
      templates: Object.values(MarketingEmailType),
      targetAudiences: ['all', 'contractors', 'recruiters', 'inactive'],
      examples: {
        newsletter: {
          name: 'Weekly Newsletter - Week of Jan 15',
          subject: '📰 ContractsOnly Weekly - New Opportunities Await',
          templateType: MarketingEmailType.NEWSLETTER,
          targetAudience: 'all',
          data: {
            highlights: [
              '🎯 AI-powered job matching is now live - find your perfect contract faster',
              '💰 Average hourly rates increased 12% this month across all categories',
              '🌟 New success story: Sarah landed a $120/hr React contract through our platform'
            ],
            jobCount: 89,
            newFeatures: [
              'Advanced skill-based filtering',
              'Improved mobile experience',
              'Real-time application status updates'
            ]
          },
          executeNow: true
        },
        featureAnnouncement: {
          name: 'AI Job Matching Launch',
          subject: '🤖 AI-Powered Job Matching is Here!',
          templateType: MarketingEmailType.FEATURE_ANNOUNCEMENT,
          targetAudience: 'contractors',
          data: {
            featureName: 'AI-Powered Job Matching',
            description: 'Our new AI algorithm analyzes your skills, experience, and preferences to recommend the most relevant contract opportunities.',
            benefits: [
              'Get matched with jobs that truly fit your expertise',
              'Save time with personalized job recommendations',
              'Discover opportunities you might have missed',
              'Higher application success rates'
            ]
          },
          executeNow: false
        },
        reactivation: {
          name: 'Win-Back Campaign Q1 2024',
          subject: 'We miss you! New opportunities await 💼',
          templateType: MarketingEmailType.REACTIVATION,
          targetAudience: 'inactive',
          data: {
            incentive: 'Premium access for 30 days when you complete your profile',
            newJobCount: 127
          },
          executeNow: false
        }
      },
      usage: {
        create: 'POST /api/marketing/campaigns',
        execute: 'POST /api/marketing/campaigns/execute',
        examples: 'GET /api/marketing/campaigns?examples=true'
      },
      authentication: {
        required: 'Bearer token with ADMIN_SECRET',
        header: 'Authorization: Bearer [ADMIN_SECRET]'
      }
    })
  }

  return NextResponse.json({
    message: 'Marketing Campaigns API',
    availableTemplates: Object.values(MarketingEmailType),
    targetAudiences: ['all', 'contractors', 'recruiters', 'inactive'],
    endpoints: {
      create: 'POST /api/marketing/campaigns',
      examples: 'GET /api/marketing/campaigns?examples=true'
    },
    requiredFields: ['name', 'subject', 'templateType', 'targetAudience'],
    optionalFields: ['data', 'executeNow']
  })
}