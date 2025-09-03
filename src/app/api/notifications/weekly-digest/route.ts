import { NextRequest, NextResponse } from 'next/server'
import { EmailAutomationEngine } from '@/lib/email/automation'

export async function POST(request: NextRequest) {
  try {
    console.log('Starting contractor weekly digest generation...')
    
    // Generate and send contractor weekly digests
    await EmailAutomationEngine.scheduleContractorWeeklyDigests()
    
    return NextResponse.json({
      success: true,
      message: 'Contractor weekly digests scheduled successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error generating contractor weekly digests:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate contractor weekly digests',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Allow manual trigger for testing
export async function GET() {
  return POST(new NextRequest('http://localhost/api/notifications/weekly-digest', { method: 'POST' }))
}