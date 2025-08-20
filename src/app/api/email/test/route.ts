import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { testEmailConfiguration } from '@/lib/email/sender'

// Test email configuration (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { testEmail } = body

    if (!testEmail) {
      return NextResponse.json(
        { error: 'testEmail is required' },
        { status: 400 }
      )
    }

    const result = await testEmailConfiguration(testEmail)

    return NextResponse.json({
      success: result.success,
      provider: result.provider,
      messageId: result.messageId,
      error: result.error,
      testedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error testing email configuration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}