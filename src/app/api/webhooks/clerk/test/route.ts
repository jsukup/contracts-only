import { NextResponse } from 'next/server'

// Test endpoint to verify webhook endpoint is accessible
export async function GET() {
  console.log('Webhook test endpoint accessed at', new Date().toISOString())
  
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoint: '/api/webhooks/clerk',
    message: 'Clerk webhook endpoint is accessible and ready to receive events',
    environment: {
      hasWebhookSecret: !!process.env.CLERK_WEBHOOK_SECRET,
      secretLength: process.env.CLERK_WEBHOOK_SECRET?.length,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    }
  })
}

export async function POST() {
  return NextResponse.json({
    error: 'This is a test endpoint. Use /api/webhooks/clerk for actual webhook events'
  }, { status: 400 })
}