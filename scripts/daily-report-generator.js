#!/usr/bin/env node
/**
 * ContractsOnly Daily Report Generator
 * 
 * Generates comprehensive daily reports about job scraping and platform performance
 * 
 * Usage: node scripts/daily-report-generator.js [--date=YYYY-MM-DD] [--format=json|markdown|both]
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class DailyReportGenerator {
  constructor(options = {}) {
    this.reportDate = options.date ? new Date(options.date) : new Date();
    this.format = options.format || 'both';
    this.reportData = {};
    this.reportsDir = '/root/contracts-only/reports';
    
    // Ensure reports directory exists
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * Generate comprehensive daily report
   */
  async generateReport() {
    console.log(`📊 Generating daily report for ${this.formatDate(this.reportDate)}...`);
    
    try {
      // Collect all report data
      await this.collectJobStatistics();
      await this.collectScrapingMetrics();
      await this.collectPerformanceMetrics();
      await this.collectSourceAnalysis();
      await this.collectQualityMetrics();
      
      // Generate report files
      const timestamp = this.reportDate.toISOString().split('T')[0];
      
      if (this.format === 'json' || this.format === 'both') {
        await this.generateJSONReport(timestamp);
      }
      
      if (this.format === 'markdown' || this.format === 'both') {
        await this.generateMarkdownReport(timestamp);
      }
      
      console.log('✅ Daily report generated successfully!');
      
    } catch (error) {
      console.error('❌ Failed to generate daily report:', error);
      throw error;
    }
  }

  /**
   * Collect overall job statistics
   */
  async collectJobStatistics() {
    console.log('📋 Collecting job statistics...');
    
    const startOfDay = new Date(this.reportDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(this.reportDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Total active jobs
    const { count: totalActive } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    // Jobs added today
    const { count: addedToday } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString());
    
    // Jobs by source
    const { data: jobsBySource } = await supabase
      .from('jobs')
      .select('source_platform')
      .eq('is_active', true);
    
    const sourceBreakdown = {};
    jobsBySource?.forEach(job => {
      const source = job.source_platform || 'manual';
      sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
    });
    
    // Average hourly rates
    const { data: rateData } = await supabase
      .from('jobs')
      .select('hourly_rate_min, hourly_rate_max')
      .eq('is_active', true)
      .not('hourly_rate_min', 'is', null)
      .not('hourly_rate_max', 'is', null);
    
    let avgMinRate = 0;
    let avgMaxRate = 0;
    
    if (rateData && rateData.length > 0) {
      avgMinRate = rateData.reduce((sum, job) => sum + job.hourly_rate_min, 0) / rateData.length;
      avgMaxRate = rateData.reduce((sum, job) => sum + job.hourly_rate_max, 0) / rateData.length;
    }
    
    this.reportData.jobStatistics = {
      totalActive,
      addedToday,
      sourceBreakdown,
      averageRates: {
        min: Math.round(avgMinRate),
        max: Math.round(avgMaxRate)
      },
      rateDataPoints: rateData?.length || 0
    };
  }

  /**
   * Collect scraping performance metrics
   */
  async collectScrapingMetrics() {
    console.log('🤖 Collecting scraping metrics...');
    
    // Check for scraping logs from today
    const logFiles = fs.readdirSync(this.reportsDir)
      .filter(file => file.includes('cleanup') && file.includes(this.formatDate(this.reportDate, 'file')))
      .sort()
      .reverse();
    
    let scrapingMetrics = {
      lastRun: null,
      jobsProcessed: 0,
      jobsAdded: 0,
      duplicatesFound: 0,
      rejectedJobs: 0,
      averageContractScore: 0
    };
    
    if (logFiles.length > 0) {
      try {
        const latestLog = JSON.parse(fs.readFileSync(path.join(this.reportsDir, logFiles[0]), 'utf8'));
        scrapingMetrics = {
          lastRun: latestLog.timestamp,
          jobsProcessed: latestLog.stats?.total || 0,
          jobsAdded: latestLog.stats?.cleaned || 0,
          duplicatesFound: latestLog.stats?.duplicates || 0,
          rejectedJobs: latestLog.stats?.rejected || 0,
          cleanupRate: latestLog.stats?.cleanupRate || 0
        };
      } catch (error) {
        console.warn('⚠️ Could not parse latest scraping log:', error.message);
      }
    }
    
    this.reportData.scrapingMetrics = scrapingMetrics;
  }

  /**
   * Collect performance metrics
   */
  async collectPerformanceMetrics() {
    console.log('⚡ Collecting performance metrics...');
    
    const startOfWeek = new Date(this.reportDate);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    
    // Job click tracking (if table exists)
    try {
      const { count: clicksThisWeek } = await supabase
        .from('job_clicks')
        .select('*', { count: 'exact', head: true })
        .gte('clicked_at', startOfWeek.toISOString());
      
      // Most clicked jobs this week
      const { data: topJobs } = await supabase
        .from('job_clicks')
        .select(`
          job_id,
          jobs!inner(title, company, external_url),
          count
        `)
        .gte('clicked_at', startOfWeek.toISOString())
        .limit(5);
      
      this.reportData.performanceMetrics = {
        clicksThisWeek: clicksThisWeek || 0,
        topClickedJobs: topJobs || []
      };
    } catch (error) {
      // Table might not exist yet
      this.reportData.performanceMetrics = {
        clicksThisWeek: 0,
        topClickedJobs: [],
        note: 'Click tracking not yet implemented'
      };
    }
  }

  /**
   * Analyze job sources performance
   */
  async collectSourceAnalysis() {
    console.log('📈 Analyzing source performance...');
    
    const startOfWeek = new Date(this.reportDate);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    
    // Jobs added this week by source
    const { data: weeklyJobs } = await supabase
      .from('jobs')
      .select('source_platform, created_at')
      .gte('created_at', startOfWeek.toISOString())
      .eq('is_active', true);
    
    const sourcePerformance = {};
    
    weeklyJobs?.forEach(job => {
      const source = job.source_platform || 'manual';
      if (!sourcePerformance[source]) {
        sourcePerformance[source] = {
          jobsThisWeek: 0,
          dailyBreakdown: {}
        };
      }
      
      sourcePerformance[source].jobsThisWeek++;
      
      const dayKey = job.created_at.split('T')[0];
      sourcePerformance[source].dailyBreakdown[dayKey] = 
        (sourcePerformance[source].dailyBreakdown[dayKey] || 0) + 1;
    });
    
    this.reportData.sourceAnalysis = sourcePerformance;
  }

  /**
   * Collect job quality metrics
   */
  async collectQualityMetrics() {
    console.log('🎯 Collecting quality metrics...');
    
    // Jobs with missing data
    const { count: missingCompany } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .or('company.is.null,company.eq.');
    
    const { count: missingRates } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .or('hourly_rate_min.is.null,hourly_rate_max.is.null');
    
    const { count: missingLocation } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .or('location.is.null,location.eq.');
    
    // External URL health check (sample)
    const { data: sampleJobs } = await supabase
      .from('jobs')
      .select('external_url')
      .eq('is_active', true)
      .not('external_url', 'is', null)
      .limit(10);
    
    let workingUrls = 0;
    if (sampleJobs) {
      // Quick URL validation for sample
      for (const job of sampleJobs) {
        try {
          if (job.external_url && job.external_url.startsWith('http')) {
            workingUrls++;
          }
        } catch (error) {
          // URL validation error
        }
      }
    }
    
    this.reportData.qualityMetrics = {
      dataQuality: {
        missingCompany: missingCompany || 0,
        missingRates: missingRates || 0,
        missingLocation: missingLocation || 0,
        totalJobs: this.reportData.jobStatistics.totalActive
      },
      urlHealth: {
        sampleSize: sampleJobs?.length || 0,
        workingUrls,
        healthRate: sampleJobs?.length ? Math.round((workingUrls / sampleJobs.length) * 100) : 0
      }
    };
  }

  /**
   * Generate JSON report
   */
  async generateJSONReport(timestamp) {
    const reportData = {
      reportDate: this.formatDate(this.reportDate),
      generatedAt: new Date().toISOString(),
      format: 'json',
      ...this.reportData
    };
    
    const fileName = `daily-report-${timestamp}.json`;
    const filePath = path.join(this.reportsDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2));
    console.log(`📄 JSON report saved: ${filePath}`);
  }

  /**
   * Generate Markdown report
   */
  async generateMarkdownReport(timestamp) {
    const markdown = this.generateMarkdownContent();
    
    const fileName = `daily-report-${timestamp}.md`;
    const filePath = path.join(this.reportsDir, fileName);
    
    fs.writeFileSync(filePath, markdown);
    console.log(`📄 Markdown report saved: ${filePath}`);
  }

  /**
   * Generate markdown content
   */
  generateMarkdownContent() {
    const { jobStatistics, scrapingMetrics, performanceMetrics, sourceAnalysis, qualityMetrics } = this.reportData;
    
    return `# ContractsOnly Daily Report
## ${this.formatDate(this.reportDate)}

Generated: ${new Date().toLocaleString()}

---

## 📊 Job Statistics

- **Total Active Jobs**: ${jobStatistics.totalActive}
- **Jobs Added Today**: ${jobStatistics.addedToday}
- **Average Rate Range**: $${jobStatistics.averageRates.min} - $${jobStatistics.averageRates.max}/hour
- **Rate Data Points**: ${jobStatistics.rateDataPoints} jobs with rate information

### Jobs by Source
${Object.entries(jobStatistics.sourceBreakdown)
  .map(([source, count]) => `- **${source}**: ${count} jobs`)
  .join('\n')}

---

## 🤖 Scraping Performance

- **Last Run**: ${scrapingMetrics.lastRun || 'N/A'}
- **Jobs Processed**: ${scrapingMetrics.jobsProcessed}
- **Jobs Added**: ${scrapingMetrics.jobsAdded}
- **Duplicates Found**: ${scrapingMetrics.duplicatesFound}
- **Rejected Jobs**: ${scrapingMetrics.rejectedJobs}

---

## ⚡ Platform Performance

- **Clicks This Week**: ${performanceMetrics.clicksThisWeek}
- **Top Clicked Jobs**: ${performanceMetrics.topClickedJobs.length} tracked

${performanceMetrics.note ? `> ${performanceMetrics.note}` : ''}

---

## 📈 Source Analysis (7 Days)

${Object.entries(sourceAnalysis)
  .map(([source, data]) => `### ${source.toUpperCase()}
- Jobs This Week: ${data.jobsThisWeek}
- Daily Activity: ${Object.keys(data.dailyBreakdown).length} active days`)
  .join('\n\n')}

---

## 🎯 Data Quality

### Missing Data Analysis
- **Missing Company**: ${qualityMetrics.dataQuality.missingCompany} jobs (${Math.round((qualityMetrics.dataQuality.missingCompany / qualityMetrics.dataQuality.totalJobs) * 100)}%)
- **Missing Rates**: ${qualityMetrics.dataQuality.missingRates} jobs (${Math.round((qualityMetrics.dataQuality.missingRates / qualityMetrics.dataQuality.totalJobs) * 100)}%)
- **Missing Location**: ${qualityMetrics.dataQuality.missingLocation} jobs (${Math.round((qualityMetrics.dataQuality.missingLocation / qualityMetrics.dataQuality.totalJobs) * 100)}%)

### URL Health Check
- **Sample Size**: ${qualityMetrics.urlHealth.sampleSize} jobs tested
- **Working URLs**: ${qualityMetrics.urlHealth.workingUrls}
- **Health Rate**: ${qualityMetrics.urlHealth.healthRate}%

---

## 📋 Recommendations

${this.generateRecommendations()}

---

*Report generated by ContractsOnly Daily Report Generator v1.0*`;
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const { jobStatistics, qualityMetrics, scrapingMetrics } = this.reportData;
    
    // Job volume recommendations
    if (jobStatistics.addedToday < 10) {
      recommendations.push('**Increase Scraping Frequency**: Only ' + jobStatistics.addedToday + ' jobs added today. Consider running scraper more frequently.');
    }
    
    // Data quality recommendations
    const missingCompanyRate = (qualityMetrics.dataQuality.missingCompany / qualityMetrics.dataQuality.totalJobs) * 100;
    if (missingCompanyRate > 5) {
      recommendations.push('**Improve Company Data**: ' + Math.round(missingCompanyRate) + '% of jobs missing company information.');
    }
    
    const missingRatesRate = (qualityMetrics.dataQuality.missingRates / qualityMetrics.dataQuality.totalJobs) * 100;
    if (missingRatesRate > 20) {
      recommendations.push('**Enhance Rate Extraction**: ' + Math.round(missingRatesRate) + '% of jobs missing rate information.');
    }
    
    // URL health recommendations
    if (qualityMetrics.urlHealth.healthRate < 90) {
      recommendations.push('**URL Health Check**: ' + qualityMetrics.urlHealth.healthRate + '% URL health rate. Consider running cleanup more frequently.');
    }
    
    // Source diversity recommendations
    const sources = Object.keys(jobStatistics.sourceBreakdown);
    if (sources.length < 3) {
      recommendations.push('**Diversify Sources**: Currently using ' + sources.length + ' job sources. Consider adding more sources for better coverage.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('**Great Job!**: All metrics look healthy. Keep monitoring for any changes.');
    }
    
    return recommendations.map(rec => `- ${rec}`).join('\n');
  }

  /**
   * Format date for display
   */
  formatDate(date, format = 'display') {
    if (format === 'file') {
      return date.toISOString().split('T')[0].replace(/-/g, '');
    }
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const options = {
    date: args.find(arg => arg.startsWith('--date='))?.split('=')[1],
    format: args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'both'
  };
  
  const generator = new DailyReportGenerator(options);
  await generator.generateReport();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = DailyReportGenerator;