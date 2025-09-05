#!/usr/bin/env node
/**
 * ContractsOnly Job Seeder
 * 
 * This script scrapes contract jobs from Indeed using JobSpy
 * and imports them into the ContractsOnly database with external URLs.
 * 
 * Usage: node scripts/job-seeder.js [--dry-run] [--limit=N]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const CONFIG = {
  SYSTEM_POSTER_ID: 'system-job-poster-001',
  MAX_TOTAL_JOBS: 500,
  MIN_CONTRACT_SCORE: 0.3,
  PYTHON_ENV: path.join(__dirname, '..', 'job-scraper-env'),
  STALE_JOB_DAYS: 30,
  DUPLICATE_CHECK_FIELDS: ['job_url', 'title_company_hash'],
  SUPPORTED_SOURCES: ['indeed', 'linkedin', 'zip_recruiter'],
  RATE_LIMITS: {
    indeed: { delay: 1000, max_concurrent: 3 },
    linkedin: { delay: 3000, max_concurrent: 1 },
    zip_recruiter: { delay: 2000, max_concurrent: 2 }
  }
};

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class JobSeeder {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.limit = options.limit || CONFIG.MAX_TOTAL_JOBS;
    this.scrapedJobs = [];
    this.importedJobs = [];
    this.rejectedJobs = [];
    this.duplicateJobs = [];
  }

  /**
   * Main execution method
   */
  async run() {
    console.log('🚀 ContractsOnly Job Seeder Starting...');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE IMPORT'}`);
    console.log(`Target: ${this.limit} jobs maximum\n`);

    try {
      // Step 1: Scrape jobs from Indeed
      await this.scrapeJobs();
      
      // Step 2: Process and filter jobs
      await this.processJobs();
      
      // Step 3: Import to database (if not dry run)
      if (!this.dryRun) {
        await this.importJobs();
      }
      
      // Step 4: Report results
      this.reportResults();
      
    } catch (error) {
      console.error('❌ Job seeding failed:', error);
      process.exit(1);
    }
  }

  /**
   * Scrape contract jobs using enhanced multi-source JobSpy
   */
  async scrapeJobs() {
    console.log('📡 Scraping contract jobs from multiple sources...');
    
    const tempFile = path.join(__dirname, 'temp-scraped-jobs.json');
    const pythonScript = path.join(__dirname, 'jobspy-scraper.py');
    
    // Clean up any existing temp files
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    
    try {
      // Execute enhanced Python scraper using virtual environment
      const pythonBinary = path.join(CONFIG.PYTHON_ENV, 'bin', 'python');
      const pythonCommand = `${pythonBinary} ${pythonScript} ${this.limit} ${CONFIG.MIN_CONTRACT_SCORE}`;
      
      console.log(`Executing: ${pythonCommand}`);
      execSync(pythonCommand, { stdio: 'inherit' });
      
      // Read results
      if (fs.existsSync(tempFile)) {
        const scrapedData = JSON.parse(fs.readFileSync(tempFile, 'utf8'));
        this.scrapedJobs = scrapedData;
        console.log(`✅ Scraped ${this.scrapedJobs.length} jobs from multiple sources`);
        
        // Show source breakdown
        const sourceStats = {};
        this.scrapedJobs.forEach(job => {
          const source = job.source_platform || 'unknown';
          sourceStats[source] = (sourceStats[source] || 0) + 1;
        });
        
        console.log('📊 Source breakdown:');
        Object.entries(sourceStats).forEach(([source, count]) => {
          console.log(`   ${source}: ${count} jobs`);
        });
        
        // Cleanup temp file
        fs.unlinkSync(tempFile);
      } else {
        throw new Error('Python scraper did not generate output file');
      }
      
    } catch (error) {
      console.error('Failed to scrape jobs:', error);
      throw error;
    }
  }


  /**
   * Process and filter scraped jobs
   */
  async processJobs() {
    console.log('🔍 Processing scraped jobs...');
    
    for (const job of this.scrapedJobs) {
      const processedJob = this.transformJob(job);
      
      // Calculate contract score
      const contractScore = this.calculateContractScore(job);
      
      if (contractScore >= CONFIG.MIN_CONTRACT_SCORE) {
        // Check for duplicates in database
        const isDuplicate = await this.checkDuplicate(job.job_url);
        
        if (isDuplicate) {
          this.duplicateJobs.push({ ...processedJob, reason: 'Duplicate URL' });
        } else {
          // Store contract score for reporting but don't include in database insert
          this.importedJobs.push(processedJob);
          // Store score separately for reporting
          processedJob._contractScore = contractScore;
        }
      } else {
        this.rejectedJobs.push({ 
          ...processedJob, 
          contractScore,
          reason: 'Low contract relevance score'
        });
      }
    }
    
    console.log(`✅ Processed ${this.scrapedJobs.length} jobs:`);
    console.log(`   - ${this.importedJobs.length} jobs ready for import`);
    console.log(`   - ${this.rejectedJobs.length} jobs rejected`);
    console.log(`   - ${this.duplicateJobs.length} duplicate jobs`);
  }

  /**
   * Transform JobSpy job to ContractsOnly schema
   */
  transformJob(job) {
    // Use rates extracted by Python scraper or fall back to extraction
    const minRate = job.hourly_rate_min || this.extractRates(job).minRate || 25;
    const maxRate = job.hourly_rate_max || this.extractRates(job).maxRate || 150;
    
    return {
      title: job.title || 'Contract Position',
      description: job.description || '',
      company: job.company || 'Unknown Company',
      location: this.normalizeLocation(job.location),
      is_remote: job.is_remote || false,
      job_type: 'CONTRACT',
      hourly_rate_min: minRate,
      hourly_rate_max: maxRate,
      currency: job.currency || 'USD',
      external_url: job.job_url,
      click_tracking_enabled: true,
      poster_id: CONFIG.SYSTEM_POSTER_ID,
      is_active: true,
      is_featured: false,
      view_count: 0,
      experience_level: 'MID', // Default experience level
      requirements: job.description || '',
      contract_duration: job.contract_duration || this.extractDuration(job.description || ''),
      source_platform: job.source_platform || 'indeed',
      last_verified_at: new Date().toISOString()
    };
  }

  /**
   * Calculate contract relevance score (or use from Python scraper)
   */
  calculateContractScore(job) {
    // Use score from Python scraper if available
    if (job.contract_score !== undefined && job.contract_score !== null) {
      return job.contract_score;
    }
    
    // Fallback to JavaScript calculation if Python scraper didn't provide score
    const description = (job.description || '').toLowerCase();
    const title = (job.title || '').toLowerCase();
    const text = description + ' ' + title;
    
    let score = 0;
    let maxScore = 10; // Fixed max score for percentage calculation
    
    // Strong positive indicators (high weight)
    const strongIndicators = [
      'contract developer', 'contract programmer', 'contractor',
      'contract-to-hire', 'c2h', 'independent contractor',
      'w2 contract', '1099', 'contract position'
    ];
    
    strongIndicators.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        score += 3;
      }
    });
    
    // Medium positive indicators
    const mediumIndicators = [
      'contract role', 'contracting', 'contract work', 'freelance'
    ];
    
    mediumIndicators.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        score += 2;
      }
    });
    
    // Rate/hourly mentions (contracts usually mention hourly rates)
    if (job.min_amount || job.max_amount || text.includes('hour') || text.includes('/hr') || text.includes('hourly')) {
      score += 2;
    }
    
    // Duration mentions (contracts have specific durations)
    if (text.includes('month') || text.includes('week') || text.includes('duration') || 
        /\d+\s*(month|week|months|weeks)/.test(text)) {
      score += 1;
    }
    
    // Remote/location flexibility (common for contract work)
    if (job.is_remote || text.includes('remote') || text.includes('anywhere')) {
      score += 1;
    }
    
    // Strong negative indicators (exclude full-time positions)
    const strongNegatives = [
      'full-time employee', 'permanent position', 'benefits package',
      'health insurance', '401k', 'pto', 'vacation days'
    ];
    
    strongNegatives.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        score -= 3;
      }
    });
    
    // Medium negative indicators
    const mediumNegatives = ['full-time', 'permanent', 'salary'];
    
    mediumNegatives.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        score -= 1;
      }
    });
    
    return Math.max(0, Math.min(score, maxScore)) / maxScore;
  }

  /**
   * Extract hourly rates from job data
   */
  extractRates(job) {
    let minRate = null;
    let maxRate = null;
    
    if (job.min_amount && job.max_amount) {
      // Convert to hourly if needed
      if (job.interval === 'yearly') {
        minRate = Math.round(job.min_amount / 2080); // 52 weeks * 40 hours
        maxRate = Math.round(job.max_amount / 2080);
      } else if (job.interval === 'hourly') {
        minRate = Math.round(job.min_amount);
        maxRate = Math.round(job.max_amount);
      }
    }
    
    // Reasonable rate validation for contracts
    if (minRate && (minRate < 15 || minRate > 300)) minRate = null;
    if (maxRate && (maxRate < 15 || maxRate > 300)) maxRate = null;
    
    return { minRate, maxRate };
  }

  /**
   * Normalize location string
   */
  normalizeLocation(location) {
    if (!location) return 'Remote';
    
    // Remove country suffix if US
    return location.replace(', US', '').trim();
  }

  /**
   * Extract contract duration from description
   */
  extractDuration(description) {
    const text = description.toLowerCase();
    
    // Look for duration patterns
    const patterns = [
      /(\d+)\s*(month|months)/,
      /(\d+)\s*(week|weeks)/,
      /(\d+)\s*-\s*(\d+)\s*(month|months)/,
      /(short\s*term|long\s*term)/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    return null;
  }

  /**
   * Check if job URL already exists in database
   */
  async checkDuplicate(jobUrl) {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('id')
        .eq('external_url', jobUrl)
        .limit(1);
      
      if (error) throw error;
      return data.length > 0;
      
    } catch (error) {
      console.error('Error checking duplicate:', error);
      return false;
    }
  }

  /**
   * Import jobs to database
   */
  async importJobs() {
    if (this.importedJobs.length === 0) {
      console.log('⚠️ No jobs to import');
      return;
    }
    
    console.log(`📥 Importing ${this.importedJobs.length} jobs to database...`);
    
    try {
      // Remove metadata fields before database insert
      const jobsForDB = this.importedJobs.map(job => {
        const { _contractScore, ...dbJob } = job;
        return dbJob;
      });
      
      const { data, error } = await supabase
        .from('jobs')
        .insert(jobsForDB);
      
      if (error) throw error;
      
      console.log(`✅ Successfully imported ${this.importedJobs.length} jobs`);
      
    } catch (error) {
      console.error('❌ Failed to import jobs:', error);
      throw error;
    }
  }

  /**
   * Report final results
   */
  reportResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 JOB SEEDING RESULTS');
    console.log('='.repeat(50));
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE IMPORT'}`);
    console.log(`Scraped: ${this.scrapedJobs.length} jobs`);
    console.log(`Ready for import: ${this.importedJobs.length} jobs`);
    console.log(`Rejected: ${this.rejectedJobs.length} jobs`);
    console.log(`Duplicates: ${this.duplicateJobs.length} jobs`);
    
    if (this.importedJobs.length > 0) {
      console.log('\n📈 CONTRACT SCORE DISTRIBUTION:');
      const scores = this.importedJobs.map(job => job._contractScore).filter(score => score !== undefined);
      if (scores.length > 0) {
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const minScore = Math.min(...scores);
        const maxScore = Math.max(...scores);
        
        console.log(`Average: ${(avgScore * 100).toFixed(1)}%`);
        console.log(`Range: ${(minScore * 100).toFixed(1)}% - ${(maxScore * 100).toFixed(1)}%`);
      }
    }
    
    if (this.rejectedJobs.length > 0) {
      console.log('\n❌ TOP REJECTION REASONS:');
      this.rejectedJobs.slice(0, 3).forEach((job, i) => {
        console.log(`${i + 1}. ${job.title} at ${job.company}`);
        console.log(`   Score: ${(job.contractScore * 100).toFixed(1)}% - ${job.reason}`);
      });
    }
    
    console.log('='.repeat(50));
    
    if (!this.dryRun && this.importedJobs.length > 0) {
      console.log('✅ Job seeding completed successfully!');
      console.log('🎯 Next steps: Monitor click-through rates and job quality');
    } else if (this.dryRun) {
      console.log('✅ Dry run completed successfully!');
      console.log('🎯 Run without --dry-run to import jobs to database');
    }
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    limit: args.find(arg => arg.startsWith('--limit='))?.split('=')[1] || CONFIG.MAX_TOTAL_JOBS
  };
  
  const seeder = new JobSeeder(options);
  await seeder.run();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = JobSeeder;