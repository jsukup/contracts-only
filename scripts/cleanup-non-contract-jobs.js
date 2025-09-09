#!/usr/bin/env node
/**
 * ContractsOnly Database Cleanup Script
 * 
 * This script identifies and removes jobs that appear to be full-time positions
 * rather than contract jobs from the ContractsOnly database.
 * 
 * Usage: node scripts/cleanup-non-contract-jobs.js [--dry-run] [--source=platform]
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const CONFIG = {
  // Strong indicators of full-time positions (high confidence removal)
  STRONG_FULL_TIME_INDICATORS: [
    'full-time employee',
    'permanent position',
    'employee benefits package',
    'comprehensive benefits',
    'full benefits package',
    'health insurance provided',
    'dental and vision insurance',
    '401k matching',
    'paid time off',
    'vacation days',
    'sick leave',
    'parental leave',
    'company stock options',
    'equity compensation'
  ],
  
  // Medium indicators (require additional context)
  MEDIUM_FULL_TIME_INDICATORS: [
    'full-time',
    'permanent',
    'salary',
    'annual salary',
    'base salary',
    'benefits eligible',
    'w-2 employee'
  ],
  
  // Contract exclusion terms (if these exist, likely not contract)
  CONTRACT_EXCLUSIONS: [
    'no contractors',
    'employees only',
    'w-2 only',
    'full-time employees only',
    'permanent employees only'
  ],

  // Contract indicators (if these exist, keep the job)
  CONTRACT_INDICATORS: [
    'contract',
    'contractor',
    'contract-to-hire',
    'c2h',
    'independent contractor',
    '1099',
    'w2 contract',
    'contract position',
    'contract role',
    'freelance',
    'consultant',
    'temporary',
    'temp',
    'project-based',
    'short-term',
    'long-term contract'
  ]
};

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class JobCleanupTool {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.sourceFilter = options.source || null;
    this.toRemove = [];
    this.toKeep = [];
    this.ambiguous = [];
  }

  /**
   * Main execution method
   */
  async run() {
    console.log('🧹 ContractsOnly Job Cleanup Starting...');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN (no changes)' : 'LIVE CLEANUP'}`);
    if (this.sourceFilter) {
      console.log(`Source Filter: ${this.sourceFilter}`);
    }
    console.log('');

    try {
      // Step 1: Analyze existing jobs
      await this.analyzeJobs();
      
      // Step 2: Report findings
      this.reportFindings();
      
      // Step 3: Remove non-contract jobs (if not dry run)
      if (!this.dryRun && this.toRemove.length > 0) {
        await this.removeJobs();
      }
      
      // Step 4: Final report
      this.finalReport();
      
    } catch (error) {
      console.error('❌ Job cleanup failed:', error);
      process.exit(1);
    }
  }

  /**
   * Analyze all jobs in database for contract relevance
   */
  async analyzeJobs() {
    console.log('🔍 Analyzing jobs for contract relevance...');
    
    let query = supabase
      .from('jobs')
      .select('id, title, company, description, external_url, source_platform, created_at')
      .neq('source_platform', 'manual');
    
    if (this.sourceFilter) {
      query = query.eq('source_platform', this.sourceFilter);
    }

    const { data: jobs, error } = await query;
    
    if (error) throw error;
    
    console.log(`📊 Analyzing ${jobs.length} jobs...`);
    
    for (const job of jobs) {
      const analysis = this.analyzeJob(job);
      
      switch (analysis.recommendation) {
        case 'remove':
          this.toRemove.push({ ...job, ...analysis });
          break;
        case 'keep':
          this.toKeep.push({ ...job, ...analysis });
          break;
        case 'ambiguous':
          this.ambiguous.push({ ...job, ...analysis });
          break;
      }
    }
  }

  /**
   * Analyze individual job for contract relevance
   */
  analyzeJob(job) {
    const description = (job.description || '').toLowerCase();
    const title = (job.title || '').toLowerCase();
    const text = description + ' ' + title;
    
    let score = 0;
    const reasons = [];
    
    // Check for strong full-time indicators
    const strongFullTimeMatches = CONFIG.STRONG_FULL_TIME_INDICATORS.filter(indicator => 
      text.includes(indicator.toLowerCase())
    );
    
    // Check for contract exclusions
    const exclusionMatches = CONFIG.CONTRACT_EXCLUSIONS.filter(exclusion => 
      text.includes(exclusion.toLowerCase())
    );
    
    // Check for contract indicators
    const contractMatches = CONFIG.CONTRACT_INDICATORS.filter(indicator => 
      text.includes(indicator.toLowerCase())
    );
    
    // Check for medium full-time indicators
    const mediumFullTimeMatches = CONFIG.MEDIUM_FULL_TIME_INDICATORS.filter(indicator => 
      text.includes(indicator.toLowerCase())
    );
    
    // Scoring logic
    if (strongFullTimeMatches.length > 0) {
      score -= 10;
      reasons.push(`Strong full-time indicators: ${strongFullTimeMatches.join(', ')}`);
    }
    
    if (exclusionMatches.length > 0) {
      score -= 8;
      reasons.push(`Contract exclusions: ${exclusionMatches.join(', ')}`);
    }
    
    if (contractMatches.length > 0) {
      score += contractMatches.length * 3;
      reasons.push(`Contract indicators: ${contractMatches.join(', ')}`);
    }
    
    if (mediumFullTimeMatches.length > 0 && contractMatches.length === 0) {
      score -= mediumFullTimeMatches.length * 2;
      reasons.push(`Medium full-time indicators (no contract terms): ${mediumFullTimeMatches.join(', ')}`);
    }
    
    // Additional context checks
    if (text.includes('hourly') || text.includes('/hr') || text.includes('per hour')) {
      score += 2;
      reasons.push('Hourly rate mentioned');
    }
    
    if (text.includes('duration') || /\d+\s*(month|week|months|weeks)/.test(text)) {
      score += 1;
      reasons.push('Duration mentioned');
    }
    
    // Determine recommendation
    let recommendation;
    if (score <= -5 || (strongFullTimeMatches.length > 0 && contractMatches.length === 0)) {
      recommendation = 'remove';
    } else if (score >= 3 || contractMatches.length >= 2) {
      recommendation = 'keep';
    } else {
      recommendation = 'ambiguous';
    }
    
    return {
      score,
      recommendation,
      reasons,
      strongFullTimeMatches,
      contractMatches,
      exclusionMatches
    };
  }

  /**
   * Report findings before taking action
   */
  reportFindings() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ANALYSIS RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Jobs to keep: ${this.toKeep.length}`);
    console.log(`❌ Jobs to remove: ${this.toRemove.length}`);
    console.log(`❓ Ambiguous jobs: ${this.ambiguous.length}`);
    
    if (this.toRemove.length > 0) {
      console.log('\n🗑️ TOP JOBS TO REMOVE:');
      this.toRemove.slice(0, 5).forEach((job, i) => {
        console.log(`${i + 1}. "${job.title}" at ${job.company}`);
        console.log(`   Score: ${job.score} | Source: ${job.source_platform}`);
        console.log(`   Reasons: ${job.reasons.slice(0, 2).join('; ')}`);
        console.log(`   URL: ${job.external_url}\n`);
      });
    }
    
    if (this.ambiguous.length > 0) {
      console.log('\n❓ AMBIGUOUS JOBS (manual review recommended):');
      this.ambiguous.slice(0, 3).forEach((job, i) => {
        console.log(`${i + 1}. "${job.title}" at ${job.company}`);
        console.log(`   Score: ${job.score} | Source: ${job.source_platform}`);
        console.log(`   Reasons: ${job.reasons.join('; ')}\n`);
      });
    }
  }

  /**
   * Remove identified non-contract jobs
   */
  async removeJobs() {
    if (this.toRemove.length === 0) return;
    
    console.log(`\n🗑️ Removing ${this.toRemove.length} non-contract jobs...`);
    
    const jobIdsToRemove = this.toRemove.map(job => job.id);
    
    // Remove in batches to avoid timeout
    const batchSize = 50;
    let removedCount = 0;
    
    for (let i = 0; i < jobIdsToRemove.length; i += batchSize) {
      const batch = jobIdsToRemove.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('jobs')
        .delete()
        .in('id', batch);
      
      if (error) {
        console.error(`❌ Error removing batch ${i / batchSize + 1}:`, error);
      } else {
        removedCount += batch.length;
        console.log(`✅ Removed batch ${i / batchSize + 1}: ${batch.length} jobs`);
      }
    }
    
    console.log(`✅ Successfully removed ${removedCount} non-contract jobs`);
  }

  /**
   * Final report
   */
  finalReport() {
    console.log('\n' + '='.repeat(60));
    console.log('🏁 CLEANUP COMPLETED');
    console.log('='.repeat(60));
    
    if (this.dryRun) {
      console.log('🔍 DRY RUN SUMMARY:');
      console.log(`   Would remove: ${this.toRemove.length} jobs`);
      console.log(`   Would keep: ${this.toKeep.length} jobs`);
      console.log(`   Need review: ${this.ambiguous.length} jobs`);
      console.log('\n💡 Run without --dry-run to perform actual cleanup');
    } else {
      console.log('✅ LIVE CLEANUP SUMMARY:');
      console.log(`   Removed: ${this.toRemove.length} jobs`);
      console.log(`   Kept: ${this.toKeep.length} jobs`);
      console.log(`   Need review: ${this.ambiguous.length} jobs`);
    }
    
    // Source platform breakdown
    const sourceStats = {};
    this.toRemove.forEach(job => {
      sourceStats[job.source_platform] = (sourceStats[job.source_platform] || 0) + 1;
    });
    
    if (Object.keys(sourceStats).length > 0) {
      console.log('\n📊 REMOVED JOBS BY SOURCE:');
      Object.entries(sourceStats).forEach(([source, count]) => {
        console.log(`   ${source}: ${count} jobs`);
      });
    }
    
    console.log('='.repeat(60));
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    source: args.find(arg => arg.startsWith('--source='))?.split('=')[1]
  };
  
  const cleanup = new JobCleanupTool(options);
  await cleanup.run();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = JobCleanupTool;