import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'

// Test database configuration
const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'http://localhost:54321'
const TEST_SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || 'test-anon-key'
const TEST_SUPABASE_SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'

// Create test Supabase clients
export const testSupabase = createClient<Database>(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY)
export const testSupabaseAdmin = createClient<Database>(TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_ROLE_KEY)

// Database test utilities
export class DatabaseTestHelper {
  private static instance: DatabaseTestHelper
  private transaction: any = null

  static getInstance(): DatabaseTestHelper {
    if (!DatabaseTestHelper.instance) {
      DatabaseTestHelper.instance = new DatabaseTestHelper()
    }
    return DatabaseTestHelper.instance
  }

  // Setup test database before all tests
  async setupDatabase(): Promise<void> {
    // Clear all test data
    await this.clearAllTables()
    
    // Seed basic test data
    await this.seedBasicData()
  }

  // Cleanup after each test
  async cleanupAfterTest(): Promise<void> {
    // If we're using transactions, rollback
    if (this.transaction) {
      await this.transaction.rollback()
      this.transaction = null
    } else {
      // Otherwise, clear test data
      await this.clearTestData()
    }
  }

  // Start a database transaction for test isolation
  async startTransaction(): Promise<void> {
    // Note: Supabase doesn't support transactions in client libraries
    // This is a placeholder for when using direct database connections
    console.log('Transaction started (placeholder)')
  }

  // Rollback transaction
  async rollbackTransaction(): Promise<void> {
    if (this.transaction) {
      await this.transaction.rollback()
      this.transaction = null
    }
  }

  // Clear all tables (use with caution!)
  private async clearAllTables(): Promise<void> {
    const tables = [
      'job_applications',
      'job_skills', 
      'jobs',
      'user_skills',
      'skills',
      'profiles',
      'users'
    ]

    // Delete in reverse dependency order
    for (const table of tables) {
      await testSupabaseAdmin.from(table).delete().neq('id', '')
    }
  }

  // Clear test-specific data
  private async clearTestData(): Promise<void> {
    // Clear data created during tests (identified by test prefixes)
    const tables = ['jobs', 'profiles', 'job_applications']
    
    for (const table of tables) {
      await testSupabaseAdmin
        .from(table)
        .delete()
        .like('title', 'TEST_%')
        .or('name.like.TEST_%,email.like.%@test.com')
    }
  }

  // Seed basic test data
  private async seedBasicData(): Promise<void> {
    // Create test users
    await this.seedTestUsers()
    
    // Create test skills
    await this.seedTestSkills()
    
    // Create test jobs
    await this.seedTestJobs()
  }

  private async seedTestUsers(): Promise<void> {
    const testUsers = [
      {
        id: 'test-user-1',
        email: 'user1@test.com',
        name: 'Test User 1',
        role: 'USER',
        created_at: new Date().toISOString(),
      },
      {
        id: 'test-employer-1', 
        email: 'employer1@test.com',
        name: 'Test Employer 1',
        role: 'EMPLOYER',
        created_at: new Date().toISOString(),
      },
      {
        id: 'test-admin-1',
        email: 'admin1@test.com', 
        name: 'Test Admin 1',
        role: 'ADMIN',
        created_at: new Date().toISOString(),
      }
    ]

    for (const user of testUsers) {
      await testSupabaseAdmin.from('users').upsert(user)
      
      // Create profile for each user
      await testSupabaseAdmin.from('profiles').upsert({
        id: user.id,
        user_id: user.id,
        name: user.name,
        bio: `Bio for ${user.name}`,
        location: 'Test Location',
        created_at: new Date().toISOString(),
      })
    }
  }

  private async seedTestSkills(): Promise<void> {
    const testSkills = [
      { id: 'test-skill-1', name: 'React', category: 'Frontend' },
      { id: 'test-skill-2', name: 'TypeScript', category: 'Language' },
      { id: 'test-skill-3', name: 'Node.js', category: 'Backend' },
      { id: 'test-skill-4', name: 'PostgreSQL', category: 'Database' },
      { id: 'test-skill-5', name: 'Python', category: 'Language' },
    ]

    await testSupabaseAdmin.from('skills').upsert(testSkills)
  }

  private async seedTestJobs(): Promise<void> {
    const testJobs = [
      {
        id: 'test-job-1',
        title: 'TEST_Senior React Developer',
        company: 'Test Tech Corp',
        location: 'Remote',
        is_remote: true,
        job_type: 'CONTRACT',
        hourly_rate_min: 80,
        hourly_rate_max: 120,
        currency: 'USD',
        description: 'Test job description for React developer',
        requirements: 'React, TypeScript, 5+ years experience',
        poster_id: 'test-employer-1',
        is_active: true,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'test-job-2',
        title: 'TEST_Python Backend Developer',
        company: 'Test Backend Corp',
        location: 'San Francisco, CA',
        is_remote: false,
        job_type: 'FULL_TIME',
        salary_min: 120000,
        salary_max: 160000,
        currency: 'USD',
        description: 'Test job description for Python developer',
        requirements: 'Python, Django, PostgreSQL',
        poster_id: 'test-employer-1',
        is_active: true,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      }
    ]

    await testSupabaseAdmin.from('jobs').upsert(testJobs)

    // Add job skills relationships
    const jobSkills = [
      { job_id: 'test-job-1', skill_id: 'test-skill-1' }, // React
      { job_id: 'test-job-1', skill_id: 'test-skill-2' }, // TypeScript
      { job_id: 'test-job-2', skill_id: 'test-skill-5' }, // Python
      { job_id: 'test-job-2', skill_id: 'test-skill-4' }, // PostgreSQL
    ]

    await testSupabaseAdmin.from('job_skills').upsert(jobSkills)
  }

  // Helper methods for creating test data in individual tests
  async createTestUser(overrides: Partial<any> = {}): Promise<any> {
    const testUser = {
      id: `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email: `user-${Date.now()}@test.com`,
      name: 'Test User',
      role: 'USER',
      created_at: new Date().toISOString(),
      ...overrides,
    }

    const { data, error } = await testSupabaseAdmin.from('users').insert(testUser).select().single()
    
    if (error) throw error
    
    // Create profile
    await testSupabaseAdmin.from('profiles').insert({
      id: testUser.id,
      user_id: testUser.id,
      name: testUser.name,
      created_at: new Date().toISOString(),
    })

    return data
  }

  async createTestJob(overrides: Partial<any> = {}): Promise<any> {
    const testJob = {
      id: `test-job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: `TEST_Job ${Date.now()}`,
      company: 'Test Company',
      location: 'Test Location',
      is_remote: true,
      job_type: 'CONTRACT',
      hourly_rate_min: 50,
      hourly_rate_max: 100,
      currency: 'USD',
      description: 'Test job description',
      requirements: 'Test requirements',
      poster_id: 'test-employer-1',
      is_active: true,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      ...overrides,
    }

    const { data, error } = await testSupabaseAdmin.from('jobs').insert(testJob).select().single()
    
    if (error) throw error
    return data
  }

  async createTestApplication(jobId: string, userId: string, overrides: Partial<any> = {}): Promise<any> {
    const testApplication = {
      id: `test-app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      job_id: jobId,
      user_id: userId,
      status: 'PENDING',
      cover_letter: 'Test cover letter',
      created_at: new Date().toISOString(),
      ...overrides,
    }

    const { data, error } = await testSupabaseAdmin.from('job_applications').insert(testApplication).select().single()
    
    if (error) throw error
    return data
  }

  // Query helpers for test assertions
  async getUser(id: string): Promise<any> {
    const { data, error } = await testSupabaseAdmin.from('users').select('*').eq('id', id).single()
    if (error) throw error
    return data
  }

  async getJob(id: string): Promise<any> {
    const { data, error } = await testSupabaseAdmin.from('jobs').select('*').eq('id', id).single()
    if (error) throw error
    return data
  }

  async getApplication(id: string): Promise<any> {
    const { data, error } = await testSupabaseAdmin.from('job_applications').select('*').eq('id', id).single()
    if (error) throw error
    return data
  }

  // Count helpers for assertions
  async countUsers(): Promise<number> {
    const { count, error } = await testSupabaseAdmin.from('users').select('*', { count: 'exact', head: true })
    if (error) throw error
    return count || 0
  }

  async countJobs(): Promise<number> {
    const { count, error } = await testSupabaseAdmin.from('jobs').select('*', { count: 'exact', head: true })
    if (error) throw error
    return count || 0
  }

  async countApplications(): Promise<number> {
    const { count, error } = await testSupabaseAdmin.from('job_applications').select('*', { count: 'exact', head: true })
    if (error) throw error
    return count || 0
  }
}

// Export singleton instance
export const dbTestHelper = DatabaseTestHelper.getInstance()

// Jest setup/teardown hooks
export const setupDatabaseTests = () => {
  beforeAll(async () => {
    await dbTestHelper.setupDatabase()
  })

  afterEach(async () => {
    await dbTestHelper.cleanupAfterTest()
  })
}

// Environment validation
export const validateTestEnvironment = () => {
  const requiredEnvVars = [
    'TEST_SUPABASE_URL',
    'TEST_SUPABASE_ANON_KEY', 
    'TEST_SUPABASE_SERVICE_ROLE_KEY'
  ]

  const missing = requiredEnvVars.filter(envVar => !process.env[envVar])
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required test environment variables: ${missing.join(', ')}\n` +
      'Please set up a test Supabase instance and configure these environment variables.'
    )
  }
}