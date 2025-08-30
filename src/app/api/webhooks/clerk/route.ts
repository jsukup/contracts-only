import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase-clerk-simple'

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your webhook secret
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET not set')
    return new Response('Server configuration error', { status: 500 })
  }

  const wh = new Webhook(webhookSecret)

  let evt: WebhookEvent

  // Verify the webhook signature
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400
    })
  }

  // Handle the webhook
  const eventType = evt.type
  const supabase = createServiceSupabaseClient()

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url, username, public_metadata } = evt.data

    const email = email_addresses[0]?.email_address
    if (!email) {
      console.error('No email address found for user:', id)
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

    // Upsert user in Supabase
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

    if (error) {
      console.error('Error upserting user:', error)
      return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 })
    }

    console.log(`User ${eventType === 'user.created' ? 'created' : 'updated'}: ${id}`)
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data

    // Delete user from Supabase (cascade will handle related data)
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting user:', error)
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
    }

    console.log(`User deleted: ${id}`)
  }

  return new Response('Webhook processed', { status: 200 })
}

// Clerk webhooks must use POST
export async function GET() {
  return new Response('Method not allowed', { status: 405 })
}