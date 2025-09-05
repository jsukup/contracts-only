#!/usr/bin/env node
/**
 * ContractsOnly Stale Job Cleanup Script
 * 
 * Removes jobs that are older than 30 days and validates external URLs
 * 
 * Usage: node scripts/stale-job-cleanup.js [--dry-run] [--days=N] [--batch-size=N]
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');
const { URL } = require('url');
require('dotenv').config();

// Configuration
const CONFIG = {
  DEFAULT_STALE_DAYS: 30,
  DEFAULT_BATCH_SIZE: 100,
  URL_CHECK_TIMEOUT: 10000, // 10 seconds
  MAX_CONCURRENT_CHECKS: 5,
  CLEANUP_REASONS: {
    STALE: 'Job older than configured days',
    INVALID_URL: 'External URL no longer accessible',
    MISSING_COMPANY: 'Missing required company information',
    INVALID_RATES: 'Invalid or missing rate information'
  }
};

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class StaleJobCleaner {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.staleDays = options.days || CONFIG.DEFAULT_STALE_DAYS;
    this.batchSize = options.batchSize || CONFIG.DEFAULT_BATCH_SIZE;
    this.cleanedJobs = [];
    this.failedUrlChecks = [];
    this.stats = {
      total: 0,
      stale: 0,
      invalidUrl: 0,
      missingData: 0,
      cleaned: 0
    };
  }

  /**
   * Main execution method
   */
  async run() {
    console.log('🧹 ContractsOnly Stale Job Cleanup Starting...');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE CLEANUP'}`);
    console.log(`Stale threshold: ${this.staleDays} days`);
    console.log(`Batch size: ${this.batchSize}\n`);

    try {
      // Step 1: Get job statistics
      await this.getJobStats();
      
      // Step 2: Find stale jobs
      const staleJobs = await this.findStaleJobs();
      
      // Step 3: Validate job URLs (sample)
      await this.validateJobUrls(staleJobs);
      
      // Step 4: Clean up jobs (if not dry run)
      if (!this.dryRun) {
        await this.cleanupJobs();
      }
      
      // Step 5: Report results
      this.reportResults();
      
    } catch (error) {
      console.error('❌ Job cleanup failed:', error);
      process.exit(1);
    }
  }

  /**
   * Get current job statistics
   */
  async getJobStats() {
    console.log('📊 Getting current job statistics...');
    
    try {
      // Total active jobs
      const { count: totalActive, error: totalError } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      if (totalError) throw totalError;
      
      // Jobs by source
      const { data: sourceStats, error: sourceError } = await supabase
        .from('jobs')
        .select('source_platform')
        .eq('is_active', true);
      
      if (sourceError) throw sourceError;
      
      // Calculate source breakdown
      const sources = {};
      sourceStats.forEach(job => {
        const source = job.source_platform || 'manual';
        sources[source] = (sources[source] || 0) + 1;
      });
      
      this.stats.total = totalActive;
      
      console.log(`✅ Current active jobs: ${totalActive}`);
      console.log('📋 By source:');
      Object.entries(sources).forEach(([source, count]) => {
        console.log(`   ${source}: ${count} jobs`);
      });
      
    } catch (error) {
      console.error('Failed to get job statistics:', error);
      throw error;
    }
  }

  /**
   * Find jobs that should be cleaned up
   */
  async findStaleJobs() {
    console.log(`\n🔍 Finding stale jobs (older than ${this.staleDays} days)...`);
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.staleDays);
      const cutoffISO = cutoffDate.toISOString();
      
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('is_active', true)
        .lt('created_at', cutoffISO)
        .order('created_at', { ascending: true })
        .limit(this.batchSize);
      
      if (error) throw error;
      
      console.log(`📋 Found ${jobs.length} jobs older than ${this.staleDays} days`);
      
      // Categorize stale jobs by reason
      for (const job of jobs) {
        const reasons = this.categorizeJob(job);
        this.cleanedJobs.push({
          ...job,
          cleanup_reasons: reasons
        });
        
        // Update stats
        if (reasons.includes('stale')) this.stats.stale++;
        if (reasons.includes('missing_data')) this.stats.missingData++;
      }
      
      return jobs;
      
    } catch (error) {
      console.error('Failed to find stale jobs:', error);
      throw error;
    }
  }

  /**
   * Categorize job for cleanup reasons
   */
  categorizeJob(job) {
    const reasons = [];
    
    // Check if stale
    const jobAge = Math.floor((Date.now() - new Date(job.created_at)) / (1000 * 60 * 60 * 24));
    if (jobAge >= this.staleDays) {
      reasons.push('stale');
    }
    
    // Check for missing data
    if (!job.company || job.company.trim() === '') {
      reasons.push('missing_data');
    }
    
    // Check for invalid rates
    if ((job.hourly_rate_min && job.hourly_rate_min < 1) || 
        (job.hourly_rate_max && job.hourly_rate_max < 1) ||
        (job.hourly_rate_min && job.hourly_rate_max && job.hourly_rate_min > job.hourly_rate_max)) {
      reasons.push('invalid_rates');
    }
    
    return reasons;
  }

  /**
   * Validate external URLs for a sample of jobs
   */
  async validateJobUrls(jobs) {
    if (jobs.length === 0) return;
    
    // Sample 20% of jobs or max 50 for URL validation
    const sampleSize = Math.min(Math.max(1, Math.floor(jobs.length * 0.2)), 50);
    const sample = jobs.slice(0, sampleSize);
    
    console.log(`\n🔗 Validating ${sample.length} external URLs...`);
    
    const urlChecks = sample.map(job => this.checkJobUrl(job));
    
    // Process in batches to avoid overwhelming servers
    for (let i = 0; i < urlChecks.length; i += CONFIG.MAX_CONCURRENT_CHECKS) {
      const batch = urlChecks.slice(i, i + CONFIG.MAX_CONCURRENT_CHECKS);
      await Promise.all(batch);
      
      // Small delay between batches
      if (i + CONFIG.MAX_CONCURRENT_CHECKS < urlChecks.length) {
        await this.sleep(1000);
      }
    }
    
    console.log(`✅ URL validation complete. ${this.stats.invalidUrl} invalid URLs found.`);
  }

  /**
   * Check if a job URL is still accessible
   */
  async checkJobUrl(job) {
    if (!job.external_url) return;
    
    return new Promise((resolve) => {
      try {
        const url = new URL(job.external_url);
        const module = url.protocol === 'https:' ? https : http;
        
        const req = module.request({
          hostname: url.hostname,
          port: url.port,
          path: url.pathname + url.search,
          method: 'HEAD',
          timeout: CONFIG.URL_CHECK_TIMEOUT,
          headers: {
            'User-Agent': 'ContractsOnly-Bot/1.0'
          }
        }, (res) => {
          // Consider 200-399 as valid, 404/410 as invalid
          if (res.statusCode >= 400) {
            this.stats.invalidUrl++;
            this.failedUrlChecks.push({
              jobId: job.id,
              url: job.external_url,
              statusCode: res.statusCode
            });
            
            // Add invalid_url reason to cleanup
            const jobInCleanup = this.cleanedJobs.find(j => j.id === job.id);
            if (jobInCleanup) {
              jobInCleanup.cleanup_reasons.push('invalid_url');
            }
          }
          resolve();
        });
        
        req.on('error', () => {
          this.stats.invalidUrl++;
          this.failedUrlChecks.push({
            jobId: job.id,
            url: job.external_url,
            error: 'Connection failed'
          });
          resolve();
        });
        
        req.on('timeout', () => {
          this.stats.invalidUrl++;
          this.failedUrlChecks.push({
            jobId: job.id,
            url: job.external_url,
            error: 'Timeout'
          });
          req.destroy();
          resolve();
        });
        
        req.end();
        
      } catch (error) {
        this.stats.invalidUrl++;
        this.failedUrlChecks.push({
          jobId: job.id,
          url: job.external_url,
          error: error.message
        });
        resolve();
      }
    });
  }

  /**
   * Clean up identified jobs
   */
  async cleanupJobs() {
    if (this.cleanedJobs.length === 0) {
      console.log('\n✅ No jobs to clean up');
      return;
    }
    
    console.log(`\n🗑️ Cleaning up ${this.cleanedJobs.length} jobs...`);
    
    try {
      const jobIds = this.cleanedJobs.map(job => job.id);
      
      // Soft delete by marking as inactive
      const { error } = await supabase
        .from('jobs')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .in('id', jobIds);
      
      if (error) throw error;
      
      this.stats.cleaned = this.cleanedJobs.length;
      console.log(`✅ Successfully cleaned up ${this.stats.cleaned} jobs`);
      
    } catch (error) {
      console.error('❌ Failed to clean up jobs:', error);
      throw error;
    }
  }

  /**
   * Report cleanup results
   */
  reportResults() {
    console.log('\n' + '='.repeat(50));
    console.log('🧹 JOB CLEANUP RESULTS');
    console.log('='.repeat(50));
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE CLEANUP'}`);
    console.log(`Stale threshold: ${this.staleDays} days`);
    console.log(`Total active jobs: ${this.stats.total}`);
    console.log(`Jobs identified for cleanup: ${this.cleanedJobs.length}`);
    
    if (this.cleanedJobs.length > 0) {
      console.log('\n📊 CLEANUP BREAKDOWN:');
      console.log(`  Stale jobs (>${this.staleDays} days): ${this.stats.stale}`);
      console.log(`  Invalid URLs: ${this.stats.invalidUrl}`);
      console.log(`  Missing data: ${this.stats.missingData}`);
      
      if (!this.dryRun) {
        console.log(`  Jobs cleaned: ${this.stats.cleaned}`);
      }
    }
    
    if (this.failedUrlChecks.length > 0) {
      console.log('\n❌ FAILED URL CHECKS (sample):');
      this.failedUrlChecks.slice(0, 5).forEach((check, i) => {
        console.log(`  ${i + 1}. Job ${check.jobId}: ${check.error || check.statusCode}`);
      });
      
      if (this.failedUrlChecks.length > 5) {
        console.log(`  ... and ${this.failedUrlChecks.length - 5} more`);
      }
    }
    
    // Calculate cleanup percentage
    if (this.stats.total > 0) {
      const cleanupPercentage = ((this.cleanedJobs.length / this.stats.total) * 100).toFixed(1);
      console.log(`\n📈 Cleanup rate: ${cleanupPercentage}% of active jobs`);
    }
    
    console.log('='.repeat(50));
    
    if (!this.dryRun && this.stats.cleaned > 0) {
      console.log('✅ Job cleanup completed successfully!');
    } else if (this.dryRun) {
      console.log('✅ Dry run completed successfully!');
      console.log('🎯 Run without --dry-run to perform actual cleanup');
    } else {
      console.log('✅ No cleanup needed - all jobs are current!');
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Generate cleanup report in JSON format
function generateReport(cleaner) {
  return {
    timestamp: new Date().toISOString(),
    mode: cleaner.dryRun ? 'dry_run' : 'live',
    config: {
      staleDays: cleaner.staleDays,
      batchSize: cleaner.batchSize
    },
    stats: cleaner.stats,
    cleanedJobs: cleaner.cleanedJobs.length,
    failedUrlChecks: cleaner.failedUrlChecks.length,
    cleanupReasons: {
      stale: cleaner.stats.stale,
      invalidUrl: cleaner.stats.invalidUrl,
      missingData: cleaner.stats.missingData
    }
  };
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    days: parseInt(args.find(arg => arg.startsWith('--days='))?.split('=')[1]) || CONFIG.DEFAULT_STALE_DAYS,
    batchSize: parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1]) || CONFIG.DEFAULT_BATCH_SIZE
  };
  
  const cleaner = new StaleJobCleaner(options);
  await cleaner.run();
  
  // Generate and save report
  const report = generateReport(cleaner);
  const fs = require('fs');
  const reportPath = `/root/contracts-only/reports/cleanup-${Date.now()}.json`;
  
  // Ensure reports directory exists
  const reportsDir = '/root/contracts-only/reports';
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Cleanup report saved to: ${reportPath}`);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = StaleJobCleaner;