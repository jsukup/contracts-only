import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase-clerk-simple'

export async function POST(req: Request) {
  const startTime = Date.now()
  const webhookId = Math.random().toString(36).substring(7)
  
  console.log(`[WEBHOOK-${webhookId}] Clerk webhook received at ${new Date().toISOString()}`)
  
  // Get the headers
  const headerPayload = headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  console.log(`[WEBHOOK-${webhookId}] Headers check:`, {
    hasSvixId: !!svix_id,
    hasSvixTimestamp: !!svix_timestamp,
    hasSvixSignature: !!svix_signature,
    svixId: svix_id,
    timestamp: svix_timestamp,
    allHeaders: Object.fromEntries(headerPayload.entries())
  })

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error(`[WEBHOOK-${webhookId}] Missing required svix headers`)
    return new Response('Error occured -- no svix headers', {
      status: 400
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  console.log(`[WEBHOOK-${webhookId}] Webhook payload:`, {
    eventType: payload.type,
    hasData: !!payload.data,
    dataKeys: payload.data ? Object.keys(payload.data) : [],
    userId: payload.data?.id,
    payloadSize: body.length
  })

  // Create a new Svix instance with your webhook secret
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

  console.log(`[WEBHOOK-${webhookId}] Environment check:`, {
    hasWebhookSecret: !!webhookSecret,
    secretLength: webhookSecret?.length,
    secretPrefix: webhookSecret ? webhookSecret.substring(0, 10) + '...' : null
  })

  if (!webhookSecret) {
    console.error(`[WEBHOOK-${webhookId}] CLERK_WEBHOOK_SECRET not set`)
    return new Response('Server configuration error', { status: 500 })
  }

  const wh = new Webhook(webhookSecret)

  let evt: WebhookEvent

  // Verify the webhook signature
  console.log(`[WEBHOOK-${webhookId}] Verifying webhook signature...`)
  const verifyStartTime = Date.now()
  
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
    
    const verifyDuration = Date.now() - verifyStartTime
    console.log(`[WEBHOOK-${webhookId}] Webhook signature verified successfully in ${verifyDuration}ms`)
    console.log(`[WEBHOOK-${webhookId}] Event details:`, {
      type: evt.type,
      hasData: !!evt.data,
      dataId: evt.data?.id,
      timestamp: evt.timestamp
    })
  } catch (err) {
    const verifyDuration = Date.now() - verifyStartTime
    console.error(`[WEBHOOK-${webhookId}] Error verifying webhook signature:`, {
      error: err,
      message: err instanceof Error ? err.message : 'Unknown error',
      verifyDuration: `${verifyDuration}ms`,
      bodyLength: body.length,
      providedHeaders: { svix_id, svix_timestamp, svix_signature }
    })
    return new Response('Error occured', {
      status: 400
    })
  }

  // Handle the webhook
  const eventType = evt.type
  console.log(`[WEBHOOK-${webhookId}] Processing event type: ${eventType}`)
  const supabase = createServiceSupabaseClient()

  if (eventType === 'user.created' || eventType === 'user.updated') {
    console.log(`[WEBHOOK-${webhookId}] Handling ${eventType} event`)
    const { id, email_addresses, first_name, last_name, image_url, username, public_metadata } = evt.data

    console.log(`[WEBHOOK-${webhookId}] User data from webhook:`, {
      id: id?.substring(0, 8) + '...',
      hasEmailAddresses: !!email_addresses?.length,
      emailCount: email_addresses?.length || 0,
      firstName: first_name,
      lastName: last_name,
      hasImage: !!image_url,
      username,
      publicMetadata: public_metadata,
      allDataKeys: Object.keys(evt.data || {})
    })

    const email = email_addresses[0]?.email_address
    if (!email) {
      console.error(`[WEBHOOK-${webhookId}] No email address found for user:`, {
        id,
        emailAddresses: email_addresses,
        hasEmailAddresses: !!email_addresses?.length
      })
      return NextResponse.json({ error: 'No email address' }, { status: 400 })
    }

    const userData = {
      id: id,
      email: email,
      name: first_name && last_name ? `${first_name} ${last_name}` : first_name || username || '',
      image: image_url || null,
      email_verified: email_addresses[0]?.verification?.status === 'verified' ? new Date().toISOString() : null,
      role: (public_metadata?.role as string) || 'USER',
      updated_at: new Date().toISOString(),
    }

    console.log(`[WEBHOOK-${webhookId}] Prepared user data for Supabase:`, {
      id: userData.id.substring(0, 8) + '...',
      email: userData.email,
      name: userData.name,
      role: userData.role,
      hasImage: !!userData.image,
      emailVerified: !!userData.email_verified
    })

    // Upsert user in Supabase
    console.log(`[WEBHOOK-${webhookId}] Executing Supabase upsert...`)
    const supabaseStartTime = Date.now()
    
    const { error } = await supabase
      .from('users')
      .upsert({
        ...userData,
        created_at: eventType === 'user.created' ? new Date().toISOString() : undefined,
        availability: 'AVAILABLE',
        job_alerts_enabled: true
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })

    const supabaseDuration = Date.now() - supabaseStartTime
    console.log(`[WEBHOOK-${webhookId}] Supabase upsert completed in ${supabaseDuration}ms`)

    if (error) {
      console.error(`[WEBHOOK-${webhookId}] Error upserting user:`, {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        userId: id?.substring(0, 8) + '...'
      })
      return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 })
    }

    console.log(`[WEBHOOK-${webhookId}] User ${eventType === 'user.created' ? 'created' : 'updated'} successfully:`, {
      userId: id.substring(0, 8) + '...',
      email: userData.email,
      role: userData.role
    })
  }

  if (eventType === 'user.deleted') {
    console.log(`[WEBHOOK-${webhookId}] Handling user.deleted event`)
    const { id } = evt.data

    console.log(`[WEBHOOK-${webhookId}] Deleting user from Supabase:`, {
      userId: id?.substring(0, 8) + '...'
    })

    // Delete user from Supabase (cascade will handle related data)
    const supabaseStartTime = Date.now()
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    const supabaseDuration = Date.now() - supabaseStartTime
    console.log(`[WEBHOOK-${webhookId}] Supabase delete completed in ${supabaseDuration}ms`)

    if (error) {
      console.error(`[WEBHOOK-${webhookId}] Error deleting user:`, {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        userId: id?.substring(0, 8) + '...'
      })
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
    }

    console.log(`[WEBHOOK-${webhookId}] User deleted successfully:`, {
      userId: id.substring(0, 8) + '...'
    })
  }

  const totalDuration = Date.now() - startTime
  console.log(`[WEBHOOK-${webhookId}] Webhook processing completed successfully in ${totalDuration}ms`)
  
  return new Response('Webhook processed', { status: 200 })
}

// Clerk webhooks must use POST
export async function GET() {
  return new Response('Method not allowed', { status: 405 })
}