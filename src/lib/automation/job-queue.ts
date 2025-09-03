/**
 * Job Queue Management System
 * Handles background job execution, retry logic, and error handling
 */

export interface JobResult {
  success: boolean
  error?: string
  executionTime?: number
  retryCount?: number
}

export interface JobConfig {
  maxRetries?: number
  retryDelay?: number
  timeout?: number
}

export class JobQueue {
  private static readonly DEFAULT_CONFIG: Required<JobConfig> = {
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    timeout: 60000 // 60 seconds
  }

  /**
   * Execute a job with retry logic and error handling
   */
  static async executeJob<T>(
    jobName: string,
    jobFunction: () => Promise<T>,
    config: JobConfig = {}
  ): Promise<JobResult> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config }
    const startTime = Date.now()
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        console.log(`[${jobName}] Attempt ${attempt + 1}/${finalConfig.maxRetries + 1}`)
        
        // Execute job with timeout
        const result = await Promise.race([
          jobFunction(),
          this.createTimeoutPromise(finalConfig.timeout, jobName)
        ])
        
        const executionTime = Date.now() - startTime
        console.log(`[${jobName}] ✅ Completed successfully in ${executionTime}ms`)
        
        return {
          success: true,
          executionTime,
          retryCount: attempt
        }
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.error(`[${jobName}] ❌ Attempt ${attempt + 1} failed:`, lastError.message)
        
        // Don't retry on final attempt
        if (attempt < finalConfig.maxRetries) {
          console.log(`[${jobName}] ⏳ Retrying in ${finalConfig.retryDelay}ms...`)
          await this.delay(finalConfig.retryDelay)
        }
      }
    }
    
    const executionTime = Date.now() - startTime
    console.error(`[${jobName}] 💥 Failed after ${finalConfig.maxRetries + 1} attempts`)
    
    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      executionTime,
      retryCount: finalConfig.maxRetries
    }
  }

  /**
   * Execute multiple jobs in parallel with individual retry logic
   */
  static async executeJobBatch(
    jobs: Array<{
      name: string
      function: () => Promise<any>
      config?: JobConfig
    }>
  ): Promise<Record<string, JobResult>> {
    console.log(`[JobQueue] Executing batch of ${jobs.length} jobs`)
    
    const jobPromises = jobs.map(job => 
      this.executeJob(job.name, job.function, job.config)
        .then(result => ({ name: job.name, result }))
    )
    
    const results = await Promise.allSettled(jobPromises)
    
    const batchResults: Record<string, JobResult> = {}
    
    results.forEach((promiseResult, index) => {
      const jobName = jobs[index].name
      
      if (promiseResult.status === 'fulfilled') {
        batchResults[jobName] = promiseResult.value.result
      } else {
        batchResults[jobName] = {
          success: false,
          error: promiseResult.reason?.message || 'Job execution failed'
        }
      }
    })
    
    const successCount = Object.values(batchResults).filter(r => r.success).length
    console.log(`[JobQueue] Batch completed: ${successCount}/${jobs.length} jobs successful`)
    
    return batchResults
  }

  /**
   * Create a timeout promise that rejects after the specified time
   */
  private static createTimeoutPromise(timeout: number, jobName: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Job '${jobName}' timed out after ${timeout}ms`))
      }, timeout)
    })
  }

  /**
   * Simple delay utility
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Health check for job execution capabilities
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    checks: Record<string, boolean>
    timestamp: string
  }> {
    const checks = {
      memoryAvailable: this.checkMemory(),
      environmentConfigured: this.checkEnvironment(),
      databaseConnectable: await this.checkDatabase()
    }
    
    const healthyChecks = Object.values(checks).filter(Boolean).length
    const totalChecks = Object.keys(checks).length
    
    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (healthyChecks === totalChecks) {
      status = 'healthy'
    } else if (healthyChecks > 0) {
      status = 'degraded'
    } else {
      status = 'unhealthy'
    }
    
    return {
      status,
      checks,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Check available memory
   */
  private static checkMemory(): boolean {
    try {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const usage = process.memoryUsage()
        const freeMemoryMB = (usage.heapTotal - usage.heapUsed) / 1024 / 1024
        return freeMemoryMB > 50 // At least 50MB free
      }
      return true // Assume healthy if can't check
    } catch {
      return false
    }
  }

  /**
   * Check environment configuration
   */
  private static checkEnvironment(): boolean {
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SENDGRID_API_KEY'
    ]
    
    return requiredEnvVars.every(envVar => {
      const value = process.env[envVar]
      return value && value.length > 0 && !value.includes('placeholder')
    })
  }

  /**
   * Check database connectivity
   */
  private static async checkDatabase(): Promise<boolean> {
    try {
      // Import dynamically to avoid module loading issues
      const { createServerSupabaseClient } = await import('@/lib/supabase')
      const supabase = createServerSupabaseClient()
      
      // Simple query to test connection
      const { error } = await supabase
        .from('users')
        .select('id')
        .limit(1)
      
      return !error
    } catch {
      return false
    }
  }
}

/**
 * Specialized job configurations for different types of work
 */
export const JobConfigs = {
  EMAIL_JOBS: {
    maxRetries: 2,
    retryDelay: 2000,
    timeout: 30000
  },
  DATABASE_JOBS: {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 15000
  },
  EXTERNAL_API_JOBS: {
    maxRetries: 3,
    retryDelay: 5000,
    timeout: 45000
  }
} as const