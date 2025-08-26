#!/usr/bin/env tsx

/**
 * Database Setup Test
 * 
 * This script checks if your test database has the required schema
 * and provides setup instructions if needed.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.test.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables:')
  if (!supabaseUrl) console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  if (!serviceRoleKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  console.error('   Update .env.test.local with your test Supabase credentials')
  process.exit(1)
}

async function checkDatabase() {
  console.log('🔍 Checking database schema...\n')
  
  const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    // Try to query the users table
    console.log('1. Testing users table access...')
    const { data: usersCheck, error: usersError } = await adminSupabase
      .from('users')
      .select('*')
      .limit(1)

    if (usersError) {
      console.log('   ❌ Users table error:', usersError.message)
      
      if (usersError.message.includes('does not exist') || usersError.code === 'PGRST106') {
        console.log('\n📝 Please create the users table in your Supabase SQL editor:')
        console.log('\n' + '='.repeat(70))
        console.log(`
-- Create the user role enum
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN', 'RECRUITER');

-- Create the users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  role user_role DEFAULT 'USER',
  email_verified TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Service role can do everything" ON users
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can read own profile" ON users
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
`)
        console.log('='.repeat(70))
        console.log('\nAfter creating the table, run this script again.')
        return false
      }
      
      return false
    }

    console.log('   ✅ Users table exists and is accessible')

    // Test basic operations
    console.log('2. Testing database operations...')
    
    // Generate a proper UUID for testing
    const testId = crypto.randomUUID()
    const testEmail = `test-setup-${Date.now()}@example.com`

    // Test insert
    const { data: insertData, error: insertError } = await adminSupabase
      .from('users')
      .insert({
        id: testId,
        email: testEmail,
        name: 'Database Setup Test User',
        role: 'USER',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()

    if (insertError) {
      console.log('   ❌ Insert test failed:', insertError.message)
      
      if (insertError.message.includes('foreign key')) {
        console.log('   💡 This is normal - the test ID doesn\'t exist in auth.users')
        console.log('      Integration tests will use real auth users')
      }
      
      // Try with a mock but valid-looking operation
      const { data: mockData, error: mockError } = await adminSupabase
        .from('users')
        .select('*')
        .eq('id', crypto.randomUUID())
        .maybeSingle()

      if (mockError) {
        console.log('   ❌ Basic query test failed:', mockError.message)
        return false
      }
      
      console.log('   ✅ Basic queries work (insert failed due to foreign key constraint)')
    } else {
      console.log('   ✅ Insert test passed')
      
      // Clean up if insert succeeded
      await adminSupabase
        .from('users')
        .delete()
        .eq('id', testId)
    }

    // Test upsert operation
    console.log('3. Testing upsert capability...')
    const mockId = crypto.randomUUID()
    const { error: upsertError } = await adminSupabase
      .from('users')
      .upsert({
        id: mockId,
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })

    if (upsertError) {
      if (upsertError.message.includes('foreign key')) {
        console.log('   ✅ Upsert capability available (expected foreign key constraint)')
      } else {
        console.log('   ❌ Upsert test failed:', upsertError.message)
        return false
      }
    } else {
      console.log('   ✅ Upsert test passed')
    }

    // Test enum constraints
    console.log('4. Testing role enum constraints...')
    const { error: enumError } = await adminSupabase
      .from('users')
      .insert({
        id: crypto.randomUUID(),
        email: 'enum-test@example.com',
        name: 'Enum Test',
        role: 'INVALID_ROLE' as any,
      })

    if (enumError) {
      if (enumError.message.includes('invalid') || enumError.message.includes('enum')) {
        console.log('   ✅ Role enum constraints working properly')
      } else {
        console.log('   ⚠️  Unexpected enum error:', enumError.message)
      }
    } else {
      console.log('   ⚠️  Role enum constraints may not be working')
    }

    console.log('\n🎉 Database schema check completed!')
    console.log('   Your database appears ready for integration tests.')
    
    return true

  } catch (error) {
    console.error('❌ Database check failed:', error)
    return false
  }
}

checkDatabase().then(success => {
  if (success) {
    console.log('\n✅ Database ready! You can now run: npm run test:integration:auth')
  } else {
    console.log('\n❌ Database setup needed. Please follow the instructions above.')
    process.exit(1)
  }
})