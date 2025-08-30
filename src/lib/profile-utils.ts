import { createServiceSupabaseClient } from './supabase-clerk-simple'

/**
 * Ensures a user profile exists in Supabase for the given Clerk user ID
 * Creates the profile if it doesn't exist
 */
export async function ensureUserProfile(userId: string) {
  if (!userId) {
    throw new Error('User ID is required')
  }

  const supabase = createServiceSupabaseClient()
  
  // Check if profile exists
  const { data: existingProfile, error: checkError } = await supabase
    .from('users')
    .select('id, role, created_at')
    .eq('id', userId)
    .maybeSingle()

  if (checkError) {
    console.error('Error checking user profile:', checkError)
    throw new Error(`Failed to check profile: ${checkError.message}`)
  }

  // If profile exists, return it
  if (existingProfile) {
    return existingProfile
  }

  // Profile doesn't exist, create it
  console.log('Creating missing user profile for:', userId)
  
  try {
    // Fetch user data from Clerk
    const clerkResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!clerkResponse.ok) {
      const errorText = await clerkResponse.text()
      throw new Error(`Clerk API error ${clerkResponse.status}: ${errorText}`)
    }

    const clerkUser = await clerkResponse.json()
    
    const newUserData = {
      id: userId,
      email: clerkUser.email_addresses?.[0]?.email_address || '',
      name: clerkUser.first_name && clerkUser.last_name 
        ? `${clerkUser.first_name} ${clerkUser.last_name}`
        : clerkUser.first_name || clerkUser.username || '',
      image: clerkUser.image_url || null,
      email_verified: clerkUser.email_addresses?.[0]?.verification?.status === 'verified' 
        ? new Date().toISOString() 
        : null,
      role: (clerkUser.public_metadata?.role as string) || 'USER',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      availability: 'AVAILABLE' as const,
      job_alerts_enabled: true
    }

    const { data: createdProfile, error: createError } = await supabase
      .from('users')
      .upsert(newUserData, {
        onConflict: 'email',
        ignoreDuplicates: false
      })
      .select('id, role, created_at')
      .single()

    if (createError) {
      console.error('Error creating user profile:', createError)
      throw new Error(`Failed to create profile: ${createError.message}`)
    }

    console.log('Successfully created user profile:', userId)
    return createdProfile

  } catch (error) {
    console.error('Error in ensureUserProfile:', error)
    throw error
  }
}

/**
 * Safely gets a user profile, creating it if it doesn't exist
 */
export async function getOrCreateUserProfile(userId: string) {
  if (!userId) {
    throw new Error('User ID is required')
  }

  const supabase = createServiceSupabaseClient()
  
  // Try to get full profile first
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select(`
      *,
      user_skills (
        skill:skill_id (
          id, name, category
        )
      )
    `)
    .eq('id', userId)
    .maybeSingle()

  if (profileError) {
    console.error('Error fetching user profile:', profileError)
    throw new Error(`Failed to fetch profile: ${profileError.message}`)
  }

  // If profile exists, return it
  if (profile) {
    return profile
  }

  // Profile doesn't exist, ensure it's created
  await ensureUserProfile(userId)
  
  // Fetch the newly created profile
  const { data: newProfile, error: newProfileError } = await supabase
    .from('users')
    .select(`
      *,
      user_skills (
        skill:skill_id (
          id, name, category
        )
      )
    `)
    .eq('id', userId)
    .single()

  if (newProfileError) {
    console.error('Error fetching newly created profile:', newProfileError)
    throw new Error(`Failed to fetch new profile: ${newProfileError.message}`)
  }

  return newProfile
}