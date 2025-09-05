#!/usr/bin/env node
/**
 * ContractsOnly Manual Daily Update Script
 * 
 * A streamlined script for manual daily job management that:
 * 1. Scrapes new jobs from multiple sources
 * 2. Cleans up stale jobs
 * 3. Generates daily reports
 * 4. Provides clear progress and results
 * 
 * Usage: node scripts/manual-daily-update.js [--dry-run] [--limit=N] [--skip-cleanup]
 */

const JobSeeder = require('./job-seeder.js');
const StaleJobCleaner = require('./stale-job-cleanup.js');
const DailyReportGenerator = require('./daily-report-generator.js');

class ManualDailyUpdate {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.limit = parseInt(options.limit) || 100;
    this.skipCleanup = options.skipCleanup || false;
    this.startTime = new Date();
    this.results = {
      scraping: null,
      cleanup: null,
      report: null,
      summary: {}
    };
  }

  /**
   * Main execution method
   */
  async run() {
    console.log('🚀 ContractsOnly Manual Daily Update');
    console.log('=====================================');
    console.log(`Mode: ${this.dryRun ? '🧪 DRY RUN' : '🔴 LIVE UPDATE'}`);
    console.log(`Job Limit: ${this.limit} jobs`);
    console.log(`Started: ${this.startTime.toLocaleTimeString()}\n`);

    try {
      // Step 1: Job Scraping
      await this.runJobScraping();
      
      // Step 2: Stale Job Cleanup (optional)
      if (!this.skipCleanup) {
        await this.runStaleJobCleanup();
      }
      
      // Step 3: Generate Daily Report
      await this.generateDailyReport();
      
      // Step 4: Show Summary
      this.showFinalSummary();
      
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Run job scraping process
   */
  async runJobScraping() {
    console.log('📡 STEP 1: Scraping New Jobs');
    console.log('─'.repeat(40));
    
    const stepStart = Date.now();
    
    try {
      const seeder = new JobSeeder({
        dryRun: this.dryRun,
        limit: this.limit
      });
      
      await seeder.run();
      
      const duration = Math.round((Date.now() - stepStart) / 1000);
      
      this.results.scraping = {
        status: 'success',
        duration,
        jobsScraped: seeder.scrapedJobs.length,
        jobsImported: seeder.importedJobs.length,
        duplicates: seeder.duplicateJobs.length,
        rejected: seeder.rejectedJobs.length
      };
      
      console.log(`✅ Job scraping completed in ${duration}s`);
      console.log(`   📊 Results: ${seeder.importedJobs.length} imported, ${seeder.duplicateJobs.length} duplicates, ${seeder.rejectedJobs.length} rejected\n`);
      
    } catch (error) {
      const duration = Math.round((Date.now() - stepStart) / 1000);
      
      this.results.scraping = {
        status: 'failed',
        duration,
        error: error.message
      };
      
      console.log(`❌ Job scraping failed after ${duration}s: ${error.message}\n`);
      // Continue with other steps even if scraping fails
    }
  }

  /**
   * Run stale job cleanup process
   */
  async runStaleJobCleanup() {
    console.log('🧹 STEP 2: Cleaning Stale Jobs');
    console.log('─'.repeat(40));
    
    const stepStart = Date.now();
    
    try {
      const cleaner = new StaleJobCleaner({
        dryRun: this.dryRun,
        days: 30,
        batchSize: 50 // Smaller batch for manual runs
      });
      
      await cleaner.run();
      
      const duration = Math.round((Date.now() - stepStart) / 1000);
      
      this.results.cleanup = {
        status: 'success',
        duration,
        jobsCleaned: cleaner.stats.cleaned,
        staleJobs: cleaner.stats.stale,
        invalidUrls: cleaner.stats.invalidUrl,
        totalProcessed: cleaner.cleanedJobs.length
      };
      
      console.log(`✅ Cleanup completed in ${duration}s`);
      console.log(`   🗑️  Results: ${cleaner.stats.cleaned} cleaned, ${cleaner.stats.stale} stale, ${cleaner.stats.invalidUrl} invalid URLs\n`);
      
    } catch (error) {
      const duration = Math.round((Date.now() - stepStart) / 1000);
      
      this.results.cleanup = {
        status: 'failed',
        duration,
        error: error.message
      };
      
      console.log(`❌ Cleanup failed after ${duration}s: ${error.message}\n`);
    }
  }

  /**
   * Generate daily report
   */
  async generateDailyReport() {
    console.log('📊 STEP 3: Generating Daily Report');
    console.log('─'.repeat(40));
    
    const stepStart = Date.now();
    
    try {
      const generator = new DailyReportGenerator({
        date: new Date(),
        format: 'both'
      });
      
      await generator.generateReport();
      
      const duration = Math.round((Date.now() - stepStart) / 1000);
      
      this.results.report = {
        status: 'success',
        duration,
        generated: true
      };
      
      const reportDate = new Date().toISOString().split('T')[0];
      console.log(`✅ Report generated in ${duration}s`);
      console.log(`   📄 Files: daily-report-${reportDate}.json, daily-report-${reportDate}.md\n`);
      
    } catch (error) {
      const duration = Math.round((Date.now() - stepStart) / 1000);
      
      this.results.report = {
        status: 'failed',
        duration,
        error: error.message
      };
      
      console.log(`❌ Report generation failed after ${duration}s: ${error.message}\n`);
    }
  }

  /**
   * Show final summary
   */
  showFinalSummary() {
    const totalDuration = Math.round((Date.now() - this.startTime.getTime()) / 1000);
    const hasErrors = this.hasErrors();
    
    console.log('🎯 SUMMARY');
    console.log('═'.repeat(50));
    console.log(`⏱️  Total Time: ${totalDuration}s (${Math.round(totalDuration/60)}m ${totalDuration%60}s)`);
    console.log(`🎮 Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);
    console.log(`📈 Status: ${hasErrors ? '⚠️  Completed with warnings' : '✅ Success'}`);
    
    // Job scraping summary
    if (this.results.scraping?.status === 'success') {
      console.log(`📡 Scraping: ✅ ${this.results.scraping.jobsImported} new jobs imported`);
    } else if (this.results.scraping?.status === 'failed') {
      console.log(`📡 Scraping: ❌ Failed - ${this.results.scraping.error}`);
    }
    
    // Cleanup summary
    if (this.results.cleanup?.status === 'success') {
      console.log(`🧹 Cleanup: ✅ ${this.results.cleanup.jobsCleaned} jobs cleaned`);
    } else if (this.results.cleanup?.status === 'failed') {
      console.log(`🧹 Cleanup: ❌ Failed - ${this.results.cleanup.error}`);
    } else if (this.skipCleanup) {
      console.log(`🧹 Cleanup: ⏭️  Skipped as requested`);
    }
    
    // Report summary
    if (this.results.report?.status === 'success') {
      console.log(`📊 Report: ✅ Daily report generated`);
    } else if (this.results.report?.status === 'failed') {
      console.log(`📊 Report: ❌ Failed - ${this.results.report.error}`);
    }
    
    console.log('═'.repeat(50));
    
    // Next steps recommendations
    this.showRecommendations();
  }

  /**
   * Show actionable recommendations
   */
  showRecommendations() {
    const recommendations = [];
    
    // Check results and provide recommendations
    if (this.results.scraping?.status === 'success') {
      const imported = this.results.scraping.jobsImported;
      const duplicates = this.results.scraping.duplicates;
      
      if (imported === 0) {
        recommendations.push('🔍 No new jobs found. Try running again later or check source websites.');
      } else if (imported < 10) {
        recommendations.push(`📈 Only ${imported} new jobs imported. Consider increasing --limit or running more frequently.`);
      } else {
        recommendations.push(`🎉 Great! ${imported} new jobs added to the platform.`);
      }
      
      if (duplicates > imported * 0.5) {
        recommendations.push('🔄 High duplicate rate suggests frequent scraping. Consider running less often.');
      }
    }
    
    if (this.results.cleanup?.status === 'success' && this.results.cleanup.jobsCleaned > 0) {
      recommendations.push(`🧹 Cleaned ${this.results.cleanup.jobsCleaned} stale jobs. Database is optimized.`);
    }
    
    if (this.results.report?.status === 'success') {
      const reportDate = new Date().toISOString().split('T')[0];
      recommendations.push(`📊 Review your daily report: reports/daily-report-${reportDate}.md`);
    }
    
    if (recommendations.length > 0) {
      console.log('💡 RECOMMENDATIONS:');
      recommendations.forEach(rec => console.log(`   ${rec}`));
    }
    
    console.log('\n🚀 Daily update complete! Run again tomorrow or as needed.');
  }

  /**
   * Check if there were any errors
   */
  hasErrors() {
    return this.results.scraping?.status === 'failed' || 
           this.results.cleanup?.status === 'failed' || 
           this.results.report?.status === 'failed';
  }

  /**
   * Handle fatal errors
   */
  handleError(error) {
    const duration = Math.round((Date.now() - this.startTime.getTime()) / 1000);
    
    console.error('\n💥 FATAL ERROR');
    console.error('═'.repeat(50));
    console.error(`⏱️  Duration: ${duration}s`);
    console.error(`❌ Error: ${error.message}`);
    console.error('═'.repeat(50));
    console.error('\n🔧 Troubleshooting:');
    console.error('   • Check your internet connection');
    console.error('   • Verify Python environment: job-scraper-env/');
    console.error('   • Check .env file for correct database credentials');
    console.error('   • Try running with --dry-run to test');
    
    process.exit(1);
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    dryRun: args.includes('--dry-run'),
    limit: args.find(arg => arg.startsWith('--limit='))?.split('=')[1],
    skipCleanup: args.includes('--skip-cleanup')
  };
  
  const updater = new ManualDailyUpdate(options);
  await updater.run();
}

// Show help if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
ContractsOnly Manual Daily Update Script

Usage:
  node scripts/manual-daily-update.js [options]

Options:
  --dry-run         Test mode - no database changes
  --limit=N         Number of jobs to scrape (default: 100)
  --skip-cleanup    Skip stale job cleanup
  --help, -h        Show this help message

Examples:
  node scripts/manual-daily-update.js                    # Normal daily run
  node scripts/manual-daily-update.js --dry-run          # Test run
  node scripts/manual-daily-update.js --limit=50         # Scrape 50 jobs
  node scripts/manual-daily-update.js --skip-cleanup     # Skip cleanup step
`);
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = ManualDailyUpdate;