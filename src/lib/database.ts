import { createServerSupabaseClient, createServiceSupabaseClient, Database } from './supabase'

// Type definitions for query builders (Supabase query helpers)
export type WhereFilter<T> = {
  [K in keyof T]?: T[K] | {
    equals?: T[K]
    not?: T[K]
    in?: T[K][]
    notIn?: T[K][]
    lt?: T[K]
    lte?: T[K]
    gt?: T[K]
    gte?: T[K]
    contains?: string
    startsWith?: string
    endsWith?: string
    mode?: 'default' | 'insensitive'
  }
}

export type OrderBy<T> = {
  [K in keyof T]?: 'asc' | 'desc'
} | {
  [K in keyof T]?: 'asc' | 'desc'
}[]

export type SelectFields<T> = {
  [K in keyof T]?: boolean
}

// Job filter types (Supabase query filters)
export interface JobWhereInput {
  id?: string
  isActive?: boolean
  title?: { contains?: string; mode?: 'insensitive' }
  company?: { contains?: string; mode?: 'insensitive' }
  description?: { contains?: string; mode?: 'insensitive' }
  requirements?: { contains?: string; mode?: 'insensitive' }
  location?: { contains?: string; mode?: 'insensitive' }
  isRemote?: boolean
  jobType?: string | { in: string[] }
  hourlyRateMin?: { gte?: number; lte?: number }
  hourlyRateMax?: { gte?: number; lte?: number }
  currency?: string
  contractDuration?: string | { in: string[] }
  hoursPerWeek?: { lt?: number; gte?: number; lte?: number; gt?: number }
  createdAt?: { gte?: Date; lte?: Date }
  posterId?: string
  OR?: JobWhereInput[]
  AND?: JobWhereInput[]
}

// Job order by types (Supabase query ordering)
export interface JobOrderByInput {
  createdAt?: 'asc' | 'desc'
  title?: 'asc' | 'desc'
  company?: 'asc' | 'desc'
  hourlyRateMin?: 'asc' | 'desc'
  hourlyRateMax?: 'asc' | 'desc'
}

// Database query helper class
export class DatabaseClient {
  private supabase
  private isServiceRole: boolean

  constructor(useServiceRole = false) {
    this.supabase = useServiceRole ? createServiceSupabaseClient() : createServerSupabaseClient()
    this.isServiceRole = useServiceRole
  }

  // Job operations
  async findManyJobs(options: {
    where?: JobWhereInput
    orderBy?: JobOrderByInput
    take?: number
    skip?: number
    include?: {
      user?: boolean | { select?: { id?: boolean; name?: boolean; email?: boolean; companyName?: boolean } }
      skills?: boolean | { select?: { id?: boolean; name?: boolean } }
      jobSkills?: boolean | { include?: { skill?: boolean | { select?: { name?: boolean } } } }
      _count?: boolean | { select?: { applications?: boolean } }
    }
  } = {}) {
    let query = this.supabase.from('jobs').select('*')

    // Apply where conditions
    if (options.where) {
      query = this.applyJobWhereConditions(query, options.where)
    }

    // Apply ordering
    if (options.orderBy) {
      Object.entries(options.orderBy).forEach(([field, direction]) => {
        query = query.order(field, { ascending: direction === 'asc' })
      })
    }

    // Apply pagination
    if (options.skip !== undefined || options.take !== undefined) {
      const from = options.skip || 0
      const to = options.take ? from + options.take - 1 : undefined
      if (to !== undefined) {
        query = query.range(from, to)
      }
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return data || []
  }

  async countJobs(where?: JobWhereInput) {
    let query = this.supabase.from('jobs').select('*', { count: 'exact', head: true })

    if (where) {
      query = this.applyJobWhereConditions(query, where)
    }

    const { count, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return count || 0
  }

  async findUniqueJob(where: { id: string }, include?: {
    user?: boolean | { select?: { id?: boolean; name?: boolean; email?: boolean } }
    skills?: boolean
    jobSkills?: boolean | { include?: { skill?: boolean } }
  }) {
    let query = this.supabase.from('jobs').select('*').eq('id', where.id).single()

    const { data, error } = await query

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw new Error(`Database error: ${error.message}`)
    }

    return data
  }

  async createJob(data: Database['public']['Tables']['jobs']['Insert']) {
    const { data: result, error } = await this.supabase
      .from('jobs')
      .insert(data)
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return result
  }

  async updateJob(where: { id: string }, data: Database['public']['Tables']['jobs']['Update']) {
    const { data: result, error } = await this.supabase
      .from('jobs')
      .update(data)
      .eq('id', where.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return result
  }

  // User operations
  async findManyUsers(options: {
    where?: any
    orderBy?: any
    take?: number
    skip?: number
    select?: any
  } = {}) {
    let query = this.supabase.from('users').select('*')

    // Apply where conditions
    if (options.where) {
      query = this.applyUserWhereConditions(query, options.where)
    }

    // Apply ordering
    if (options.orderBy) {
      Object.entries(options.orderBy).forEach(([field, direction]) => {
        query = query.order(field, { ascending: direction === 'asc' })
      })
    }

    // Apply pagination
    if (options.skip !== undefined || options.take !== undefined) {
      const from = options.skip || 0
      const to = options.take ? from + options.take - 1 : undefined
      if (to !== undefined) {
        query = query.range(from, to)
      }
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return data || []
  }

  async countUsers(where?: any) {
    let query = this.supabase.from('users').select('*', { count: 'exact', head: true })

    if (where) {
      query = this.applyUserWhereConditions(query, where)
    }

    const { count, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return count || 0
  }

  async findUniqueUser(where: { id?: string; email?: string }, select?: any) {
    let query = this.supabase.from('users').select('*')

    if (where.id) {
      query = query.eq('id', where.id)
    } else if (where.email) {
      query = query.eq('email', where.email)
    }

    const { data, error } = await query.single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw new Error(`Database error: ${error.message}`)
    }

    return data
  }

  // Application operations
  async countApplications(where?: any) {
    let query = this.supabase.from('job_applications').select('*', { count: 'exact', head: true })

    if (where) {
      query = this.applyApplicationWhereConditions(query, where)
    }

    const { count, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return count || 0
  }

  // Skill operations
  async findManySkills(options: {
    where?: any
    orderBy?: any
    take?: number
    select?: any
  } = {}) {
    let query = this.supabase.from('skills').select('*')

    // Apply ordering
    if (options.orderBy) {
      Object.entries(options.orderBy).forEach(([field, direction]) => {
        query = query.order(field, { ascending: direction === 'asc' })
      })
    }

    // Apply pagination
    if (options.take) {
      query = query.limit(options.take)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return data || []
  }

  // Aggregation operations (Supabase RPC and custom queries)
  async aggregateJobs(options: {
    where?: JobWhereInput
    _avg?: { hourlyRateMin?: boolean; hourlyRateMax?: boolean }
    _count?: { id?: boolean }
    by?: string[]
  }) {
    // For aggregations, we'll use RPC functions or raw SQL
    if (options._avg) {
      const { data, error } = await this.supabase.rpc('get_job_rate_averages', {
        where_conditions: options.where || {}
      })

      if (error) {
        // Fallback to basic calculation if RPC doesn't exist
        const jobs = await this.findManyJobs({ where: options.where })
        const avgMin = jobs.reduce((sum, job) => sum + (job.hourly_rate_min || 0), 0) / (jobs.length || 1)
        const avgMax = jobs.reduce((sum, job) => sum + (job.hourly_rate_max || 0), 0) / (jobs.length || 1)
        
        return {
          _avg: {
            hourlyRateMin: avgMin,
            hourlyRateMax: avgMax
          }
        }
      }

      return data
    }

    return {}
  }

  // Group by operations (for analytics)
  async groupByJobs(options: {
    by: string[]
    where?: JobWhereInput
    _count?: { id?: boolean }
    orderBy?: any
  }) {
    // This is a complex operation that might need custom RPC functions
    // For now, we'll implement basic grouping for common cases
    
    if (options.by.includes('job_type')) {
      const { data, error } = await this.supabase
        .from('jobs')
        .select('job_type, count(*)')
        .groupBy('job_type')

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      return data?.map(item => ({
        jobType: item.job_type,
        _count: { id: item.count }
      })) || []
    }

    return []
  }

  // Helper methods for applying where conditions
  private applyJobWhereConditions(query: any, where: JobWhereInput) {
    if (where.id) {
      query = query.eq('id', where.id)
    }
    if (where.isActive !== undefined) {
      query = query.eq('is_active', where.isActive)
    }
    if (where.isRemote !== undefined) {
      query = query.eq('is_remote', where.isRemote)
    }
    if (where.posterId) {
      query = query.eq('poster_id', where.posterId)
    }
    if (where.currency) {
      query = query.eq('currency', where.currency)
    }

    // Text search conditions
    if (where.title?.contains) {
      query = query.ilike('title', `%${where.title.contains}%`)
    }
    if (where.company?.contains) {
      query = query.ilike('company', `%${where.company.contains}%`)
    }
    if (where.description?.contains) {
      query = query.ilike('description', `%${where.description.contains}%`)
    }
    if (where.requirements?.contains) {
      query = query.ilike('requirements', `%${where.requirements.contains}%`)
    }
    if (where.location?.contains) {
      query = query.ilike('location', `%${where.location.contains}%`)
    }

    // Numeric range conditions
    if (where.hourlyRateMin?.gte) {
      query = query.gte('hourly_rate_min', where.hourlyRateMin.gte)
    }
    if (where.hourlyRateMin?.lte) {
      query = query.lte('hourly_rate_min', where.hourlyRateMin.lte)
    }
    if (where.hourlyRateMax?.gte) {
      query = query.gte('hourly_rate_max', where.hourlyRateMax.gte)
    }
    if (where.hourlyRateMax?.lte) {
      query = query.lte('hourly_rate_max', where.hourlyRateMax.lte)
    }

    // Date conditions
    if (where.createdAt?.gte) {
      query = query.gte('created_at', where.createdAt.gte.toISOString())
    }
    if (where.createdAt?.lte) {
      query = query.lte('created_at', where.createdAt.lte.toISOString())
    }

    // Array conditions
    if (where.jobType && typeof where.jobType === 'object' && 'in' in where.jobType) {
      query = query.in('job_type', where.jobType.in)
    } else if (typeof where.jobType === 'string') {
      query = query.eq('job_type', where.jobType)
    }

    if (where.contractDuration && typeof where.contractDuration === 'object' && 'in' in where.contractDuration) {
      query = query.in('contract_duration', where.contractDuration.in)
    }

    // Hours per week conditions
    if (where.hoursPerWeek) {
      if (where.hoursPerWeek.lt) {
        query = query.lt('hours_per_week', where.hoursPerWeek.lt)
      }
      if (where.hoursPerWeek.gte) {
        query = query.gte('hours_per_week', where.hoursPerWeek.gte)
      }
      if (where.hoursPerWeek.lte) {
        query = query.lte('hours_per_week', where.hoursPerWeek.lte)
      }
      if (where.hoursPerWeek.gt) {
        query = query.gt('hours_per_week', where.hoursPerWeek.gt)
      }
    }

    return query
  }

  private applyUserWhereConditions(query: any, where: any) {
    if (where.id) {
      query = query.eq('id', where.id)
    }
    if (where.email) {
      query = query.eq('email', where.email)
    }
    if (where.role) {
      query = query.eq('role', where.role)
    }
    if (where.jobAlertsEnabled !== undefined) {
      query = query.eq('job_alerts_enabled', where.jobAlertsEnabled)
    }
    if (where.createdAt?.lte) {
      query = query.lte('created_at', where.createdAt.lte.toISOString())
    }
    if (where.createdAt?.gte) {
      query = query.gte('created_at', where.createdAt.gte.toISOString())
    }

    return query
  }

  private applyApplicationWhereConditions(query: any, where: any) {
    if (where.createdAt?.gte) {
      query = query.gte('created_at', where.createdAt.gte.toISOString())
    }
    if (where.createdAt?.lte) {
      query = query.lte('created_at', where.createdAt.lte.toISOString())
    }

    return query
  }
}

// Convenience functions (Supabase database helpers)
export const createDatabaseClient = (useServiceRole = false) => new DatabaseClient(useServiceRole)

// Default client instance
export const db = new DatabaseClient()

// Service role client for admin operations
export const adminDb = new DatabaseClient(true)