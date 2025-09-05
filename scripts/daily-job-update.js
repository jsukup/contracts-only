#!/usr/bin/env node
/**
 * ContractsOnly Master Daily Job Update Script
 * 
 * Orchestrates the complete daily job update process:
 * 1. Scrapes jobs from multiple sources
 * 2. Processes and validates job data
 * 3. Updates database with new jobs
 * 4. Cleans up stale jobs
 * 5. Generates daily report
 * 
 * Usage: node scripts/daily-job-update.js [--dry-run] [--skip-scraping] [--skip-cleanup]
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Import our custom modules
const JobSeeder = require('./job-seeder.js');
const StaleJobCleaner = require('./stale-job-cleanup.js');
const DailyReportGenerator = require('./daily-report-generator.js');

// Configuration
const CONFIG = {
  MAX_EXECUTION_TIME: 30 * 60 * 1000, // 30 minutes
  LOCK_FILE: '/tmp/contracts-only-daily-update.lock',
  LOG_FILE: '/root/contracts-only/logs/daily-update.log',
  EMAIL_NOTIFICATIONS: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
  NOTIFICATION_EMAIL: process.env.NOTIFICATION_EMAIL || 'admin@contracts-only.com'
};

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class DailyJobUpdateOrchestrator {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.skipScraping = options.skipScraping || false;
    this.skipCleanup = options.skipCleanup || false;
    this.startTime = new Date();
    this.results = {
      scraping: null,
      cleanup: null,
      report: null,
      errors: []
    };
    
    // Ensure logs directory exists
    const logsDir = path.dirname(CONFIG.LOG_FILE);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  /**
   * Main orchestration method
   */
  async run() {
    console.log('🚀 ContractsOnly Daily Job Update Starting...');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);
    console.log(`Started at: ${this.startTime.toLocaleString()}\n`);

    try {
      // Check for existing lock
      await this.checkLock();
      
      // Create lock file
      await this.createLock();
      
      // Set execution timeout
      this.setupTimeout();
      
      // Step 1: Job Scraping (unless skipped)
      if (!this.skipScraping) {
        await this.runJobScraping();
      } else {
        console.log('⏭️ Skipping job scraping as requested\n');
      }
      
      // Step 2: Stale Job Cleanup (unless skipped)  
      if (!this.skipCleanup) {
        await this.runStaleJobCleanup();
      } else {
        console.log('⏭️ Skipping stale job cleanup as requested\n');
      }
      
      // Step 3: Generate Daily Report
      await this.generateDailyReport();
      
      // Step 4: Update database metrics
      await this.updateDatabaseMetrics();
      
      // Step 5: Send notifications (if enabled)
      if (CONFIG.EMAIL_NOTIFICATIONS) {
        await this.sendNotifications();
      }
      
      // Complete successfully
      await this.completeExecution();
      
    } catch (error) {
      await this.handleError(error);
    } finally {
      // Always cleanup lock file
      await this.removeLock();
    }
  }

  /**
   * Check for existing lock file
   */
  async checkLock() {
    if (fs.existsSync(CONFIG.LOCK_FILE)) {
      const lockData = JSON.parse(fs.readFileSync(CONFIG.LOCK_FILE, 'utf8'));
      const lockAge = Date.now() - new Date(lockData.created).getTime();
      
      // If lock is older than max execution time, remove it (stale lock)
      if (lockAge > CONFIG.MAX_EXECUTION_TIME) {
        console.log('⚠️ Removing stale lock file');
        fs.unlinkSync(CONFIG.LOCK_FILE);
      } else {
        throw new Error(`Another instance is already running (PID: ${lockData.pid})`);
      }
    }
  }

  /**
   * Create lock file
   */
  async createLock() {
    const lockData = {
      pid: process.pid,
      created: new Date().toISOString(),
      mode: this.dryRun ? 'dry-run' : 'live'
    };
    
    fs.writeFileSync(CONFIG.LOCK_FILE, JSON.stringify(lockData, null, 2));
  }

  /**
   * Setup execution timeout
   */
  setupTimeout() {
    setTimeout(() => {
      console.error('❌ Execution timeout reached');
      this.handleError(new Error('Execution timeout'));
      process.exit(1);
    }, CONFIG.MAX_EXECUTION_TIME);
  }

  /**
   * Run job scraping process
   */
  async runJobScraping() {
    console.log('📡 STEP 1: Job Scraping');
    console.log('='.repeat(30));
    
    try {
      const seeder = new JobSeeder({
        dryRun: this.dryRun,
        limit: 500 // Daily limit
      });
      
      await seeder.run();
      
      this.results.scraping = {
        status: 'success',
        jobsScraped: seeder.scrapedJobs.length,
        jobsImported: seeder.importedJobs.length,
        duplicates: seeder.duplicateJobs.length,
        rejected: seeder.rejectedJobs.length
      };
      
      console.log('✅ Job scraping completed successfully\n');
      
    } catch (error) {
      this.results.scraping = {
        status: 'failed',
        error: error.message
      };
      
      this.results.errors.push({
        step: 'scraping',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      console.error('❌ Job scraping failed:', error.message);
      // Continue with other steps even if scraping fails
    }
  }

  /**
   * Run stale job cleanup process
   */
  async runStaleJobCleanup() {
    console.log('🧹 STEP 2: Stale Job Cleanup');
    console.log('='.repeat(30));
    
    try {
      const cleaner = new StaleJobCleaner({
        dryRun: this.dryRun,
        days: 30,
        batchSize: 100
      });
      
      await cleaner.run();
      
      this.results.cleanup = {
        status: 'success',
        jobsCleaned: cleaner.stats.cleaned,
        staleJobs: cleaner.stats.stale,
        invalidUrls: cleaner.stats.invalidUrl,
        totalProcessed: cleaner.cleanedJobs.length
      };
      
      console.log('✅ Stale job cleanup completed successfully\n');
      
    } catch (error) {
      this.results.cleanup = {
        status: 'failed',
        error: error.message
      };
      
      this.results.errors.push({
        step: 'cleanup',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      console.error('❌ Stale job cleanup failed:', error.message);
      // Continue with other steps
    }
  }

  /**
   * Generate daily report
   */
  async generateDailyReport() {
    console.log('📊 STEP 3: Daily Report Generation');
    console.log('='.repeat(30));
    
    try {
      const generator = new DailyReportGenerator({
        date: new Date(),
        format: 'both'
      });
      
      await generator.generateReport();
      
      this.results.report = {
        status: 'success',
        generated: true
      };
      
      console.log('✅ Daily report generated successfully\n');
      
    } catch (error) {
      this.results.report = {
        status: 'failed',
        error: error.message
      };
      
      this.results.errors.push({
        step: 'reporting',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      console.error('❌ Daily report generation failed:', error.message);
    }
  }

  /**
   * Update database with execution metrics
   */
  async updateDatabaseMetrics() {
    console.log('📊 STEP 4: Database Metrics Update');
    console.log('='.repeat(30));
    
    try {
      // Create execution log entry (if table exists)
      const executionLog = {
        execution_date: this.startTime.toISOString().split('T')[0],
        started_at: this.startTime.toISOString(),
        completed_at: new Date().toISOString(),
        mode: this.dryRun ? 'dry_run' : 'live',
        results: this.results,
        duration_minutes: Math.round((Date.now() - this.startTime.getTime()) / 60000)
      };
      
      // For now, just log to file since we may not have the execution_logs table
      const logPath = `/root/contracts-only/logs/execution-${this.startTime.toISOString().split('T')[0]}.json`;
      fs.writeFileSync(logPath, JSON.stringify(executionLog, null, 2));
      
      console.log(`✅ Execution metrics saved to: ${logPath}\n`);
      
    } catch (error) {
      console.error('⚠️ Could not save execution metrics:', error.message);
      // This is not critical, so we continue
    }
  }

  /**
   * Send email notifications (if enabled)
   */
  async sendNotifications() {
    console.log('📧 STEP 5: Email Notifications');
    console.log('='.repeat(30));
    
    try {
      // This would integrate with your email service (Resend, etc.)
      console.log('📧 Email notifications not yet implemented');
      
      // Placeholder for future email integration
      const emailData = {
        to: CONFIG.NOTIFICATION_EMAIL,
        subject: `ContractsOnly Daily Update - ${this.startTime.toISOString().split('T')[0]}`,
        summary: this.generateExecutionSummary()
      };
      
      console.log('✅ Notification prepared (implementation pending)\n');
      
    } catch (error) {
      console.error('⚠️ Notification failed:', error.message);
    }
  }

  /**
   * Complete execution successfully
   */
  async completeExecution() {
    const duration = Math.round((Date.now() - this.startTime.getTime()) / 60000);
    const hasErrors = this.results.errors.length > 0;
    
    console.log('='.repeat(50));
    console.log('🎉 DAILY UPDATE COMPLETE');
    console.log('='.repeat(50));
    console.log(`Duration: ${duration} minutes`);
    console.log(`Status: ${hasErrors ? 'Completed with errors' : 'Success'}`);
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);
    
    if (this.results.scraping) {
      console.log(`Jobs imported: ${this.results.scraping.jobsImported || 0}`);
    }
    
    if (this.results.cleanup) {
      console.log(`Jobs cleaned: ${this.results.cleanup.jobsCleaned || 0}`);
    }
    
    if (hasErrors) {
      console.log(`\n⚠️  ${this.results.errors.length} errors occurred:`);
      this.results.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error.step}: ${error.error}`);
      });
    }
    
    console.log('='.repeat(50));
  }

  /**
   * Handle execution errors
   */
  async handleError(error) {
    const duration = Math.round((Date.now() - this.startTime.getTime()) / 60000);
    
    console.error('\n' + '='.repeat(50));
    console.error('❌ DAILY UPDATE FAILED');
    console.error('='.repeat(50));
    console.error(`Duration: ${duration} minutes`);
    console.error(`Error: ${error.message}`);
    console.error(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);
    console.error('='.repeat(50));
    
    // Log error details
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      results: this.results,
      duration_minutes: duration
    };
    
    const errorLogPath = `/root/contracts-only/logs/error-${Date.now()}.json`;
    fs.writeFileSync(errorLogPath, JSON.stringify(errorLog, null, 2));
    
    process.exit(1);
  }

  /**
   * Remove lock file
   */
  async removeLock() {
    try {
      if (fs.existsSync(CONFIG.LOCK_FILE)) {
        fs.unlinkSync(CONFIG.LOCK_FILE);
      }
    } catch (error) {
      console.error('⚠️ Could not remove lock file:', error.message);
    }
  }

  /**
   * Generate execution summary for notifications
   */
  generateExecutionSummary() {
    const summary = [];
    const duration = Math.round((Date.now() - this.startTime.getTime()) / 60000);
    
    summary.push(`Daily update completed in ${duration} minutes`);
    
    if (this.results.scraping?.status === 'success') {
      summary.push(`✅ Scraping: ${this.results.scraping.jobsImported} jobs imported`);
    } else if (this.results.scraping?.status === 'failed') {
      summary.push(`❌ Scraping: Failed - ${this.results.scraping.error}`);
    }
    
    if (this.results.cleanup?.status === 'success') {
      summary.push(`✅ Cleanup: ${this.results.cleanup.jobsCleaned} jobs cleaned`);
    } else if (this.results.cleanup?.status === 'failed') {
      summary.push(`❌ Cleanup: Failed - ${this.results.cleanup.error}`);
    }
    
    if (this.results.errors.length > 0) {
      summary.push(`⚠️ ${this.results.errors.length} errors occurred`);
    }
    
    return summary.join('\n');
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    skipScraping: args.includes('--skip-scraping'),
    skipCleanup: args.includes('--skip-cleanup')
  };
  
  const orchestrator = new DailyJobUpdateOrchestrator(options);
  await orchestrator.run();
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n⚠️ Received SIGINT. Cleaning up...');
  if (fs.existsSync(CONFIG.LOCK_FILE)) {
    fs.unlinkSync(CONFIG.LOCK_FILE);
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️ Received SIGTERM. Cleaning up...');
  if (fs.existsSync(CONFIG.LOCK_FILE)) {
    fs.unlinkSync(CONFIG.LOCK_FILE);
  }
  process.exit(0);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    
    // Clean up lock file on fatal error
    if (fs.existsSync(CONFIG.LOCK_FILE)) {
      fs.unlinkSync(CONFIG.LOCK_FILE);
    }
    
    process.exit(1);
  });
}

module.exports = DailyJobUpdateOrchestrator;