# ContractsOnly Job Seeding Implementation Plan

## Overview
This document outlines the phased approach to seed ContractsOnly with real contract and contract-to-hire job postings from existing job boards. Jobs will link to original postings for external applications.

## Architecture Requirements
- **Database**: Supabase with existing job schema
- **External URLs**: Use `external_url` field for original job board links
- **Job Type Filtering**: Focus on 'CONTRACT' and contract-to-hire positions only
- **Click Tracking**: Enable `click_tracking_enabled` for analytics
- **Application Flow**: All applications happen on external job boards

## Phase 1: Quick Contract Seeding (Week 1)

### Objective
Seed database with 300-500 verified contract positions using JobSpy library focused on Indeed.

### Technical Implementation

#### 1. Setup JobSpy Environment
```bash
# Install JobSpy Python library
pip install python-jobspy
```

#### 2. Create Job Scraper Service
**File**: `scripts/job-seeder.js`
- Node.js wrapper around Python JobSpy
- Contract-specific search terms
- Data transformation to ContractsOnly schema
- External URL validation

#### 3. Search Strategy
**Primary Target**: Indeed (no rate limits, good contract volume)
**Search Terms**:
- "software contractor"
- "contract developer"
- "contract-to-hire"
- "independent contractor"
- "contract programmer"

**Search Parameters**:
```javascript
{
  site_name: ['indeed'],
  search_term: searchTerm,
  job_type: 'contract',
  location: 'United States',
  is_remote: null, // Include both remote and on-site
  results_wanted: 100, // Per search term
  distance: 25
}
```

#### 4. Data Transformation
Map JobSpy output to ContractsOnly schema:
```javascript
const transformJob = (jobSpyJob) => ({
  title: jobSpyJob.title,
  description: jobSpyJob.description,
  company: jobSpyJob.company,
  location: jobSpyJob.location?.city || 'Remote',
  is_remote: jobSpyJob.is_remote || false,
  job_type: 'CONTRACT',
  hourly_rate_min: extractMinRate(jobSpyJob.salary),
  hourly_rate_max: extractMaxRate(jobSpyJob.salary),
  currency: 'USD',
  external_url: jobSpyJob.job_url,
  click_tracking_enabled: true,
  poster_id: SYSTEM_POSTER_ID,
  is_active: true,
  contract_duration: extractDuration(jobSpyJob.description),
  requirements: jobSpyJob.description
});
```

#### 5. Quality Filters
- **Contract Validation**: Score descriptions for contract keywords
- **Freshness**: Only jobs posted within last 30 days
- **URL Validation**: Verify external links are functional
- **Rate Extraction**: Parse hourly rates from descriptions
- **Duplicate Detection**: Hash-based deduplication

#### 6. System Poster Setup
Create system user account for external job postings:
```sql
INSERT INTO users (id, email, name, role) 
VALUES ('system-job-poster', 'jobs@contractsonly.com', 'ContractsOnly Job Feed', 'ADMIN');
```

### Week 1 Deliverables
- [x] JobSpy integration script
- [x] Contract job validation system
- [x] External URL click tracking
- [x] 300+ verified contract positions imported
- [x] Basic analytics dashboard for imported jobs

### Success Metrics Week 1
- **Job Count**: 300-500 contract positions
- **Contract Relevance**: 85%+ genuine contract roles
- **External URL Validity**: 95%+ working links
- **Geographic Coverage**: Jobs across 10+ US states

---

## Phase 2: Quality & Compliance (Week 2)

### Objective
Enhance data quality, implement legal compliance measures, and optimize for contract-specific positions.

### Technical Implementation

#### 1. Enhanced Contract Validation
**Contract Score Algorithm**:
- Positive keywords: "contractor", "contract-to-hire", "C2H", "independent contractor"
- Negative keywords: "full-time", "permanent", "employee", "W-2 only"
- Rate mention bonus: Hourly rate mentioned explicitly
- Duration bonus: Contract length specified

#### 2. Legal Compliance System
- Add proper attribution: "Originally posted on Indeed"
- Implement robots.txt respect
- Add rate limiting: Max 100 requests/hour
- Create takedown request handler
- Implement data retention policies (90 days for inactive jobs)

#### 3. Data Quality Improvements
- **Skill Extraction**: NLP-based skill identification from descriptions
- **Location Standardization**: Normalize location formats
- **Rate Normalization**: Convert all rates to hourly equivalents
- **Description Cleaning**: Remove HTML, normalize formatting

#### 4. Automated Quality Checks
```javascript
const qualityChecks = {
  hasValidExternalUrl: (job) => validateUrl(job.external_url),
  hasContractKeywords: (job) => calculateContractScore(job.description) > 0.7,
  hasReasonableRate: (job) => job.hourly_rate_min >= 25 && job.hourly_rate_max <= 300,
  isRecent: (job) => job.created_at > Date.now() - (30 * 24 * 60 * 60 * 1000),
  hasMinDescription: (job) => job.description.length > 100
};
```

### Week 2 Deliverables
- [x] Enhanced contract validation (90%+ accuracy)
- [x] Legal compliance framework
- [x] Automated quality scoring system
- [x] Skill extraction and tagging
- [x] Job freshness validation

### Success Metrics Week 2
- **Contract Relevance**: 90%+ genuine contract positions
- **Data Quality Score**: 85%+ jobs pass all quality checks
- **Skill Coverage**: 80%+ jobs have extracted skills
- **Compliance**: Zero takedown requests

---

## Phase 3: Scale & Diversify (Week 3-4)

### Objective
Scale to multiple job boards, implement automation, and add comprehensive analytics.

### Technical Implementation

#### 1. Multi-Board Integration
**Add LinkedIn** (with careful rate limiting):
```javascript
const linkedInConfig = {
  site_name: ['linkedin'],
  search_term: 'contract developer',
  results_wanted: 25, // Conservative due to rate limits
  proxies: [], // Rotate IPs if needed
  delay: 2000 // 2 second delay between requests
};
```

**Add ZipRecruiter**:
```javascript
const zipRecruiterConfig = {
  site_name: ['zip_recruiter'],
  search_term: 'contractor',
  location: 'United States',
  results_wanted: 50
};
```

#### 2. Upwork API Integration
Setup official Upwork API for compliant data:
```javascript
const upworkAPI = {
  endpoint: 'https://www.upwork.com/api/profiles/v1/search/jobs',
  auth: 'OAuth 2.0',
  filters: {
    job_type: 'hourly,fixed-price',
    duration: 'week,month,quarter,semester'
  }
};
```

#### 3. Automated Daily Refresh
**Cron Schedule**: Daily at 2 AM EST
```javascript
const refreshSchedule = {
  indeed: { frequency: 'daily', maxJobs: 100 },
  linkedin: { frequency: 'weekly', maxJobs: 25 },
  ziprecruiter: { frequency: 'daily', maxJobs: 50 },
  upwork: { frequency: 'daily', maxJobs: 200 }
};
```

#### 4. Advanced Analytics
- **Click-through tracking**: Monitor external link engagement
- **Source performance**: Track which job boards generate most clicks
- **Job performance**: Identify most viewed contract positions
- **User engagement**: Monitor search patterns and preferences

#### 5. Quality Monitoring Dashboard
Real-time monitoring of:
- Job import success rates
- Contract relevance scores
- External URL validity
- User engagement metrics
- System performance metrics

### Week 3-4 Deliverables
- [x] LinkedIn integration (rate-limited)
- [x] ZipRecruiter integration
- [x] Upwork API integration
- [x] Automated daily job refresh system
- [x] Comprehensive analytics dashboard
- [x] Click-through tracking implementation
- [x] Performance monitoring system

### Success Metrics Week 3-4
- **Job Volume**: 1000+ active contract positions
- **Source Diversity**: 4+ different job boards
- **Daily Refresh**: 100+ new jobs added daily
- **Click-Through Rate**: 15%+ of job views result in external clicks
- **System Uptime**: 99%+ availability for job refresh

---

## Technical Architecture

### Database Schema Enhancements
```sql
-- Add job source tracking
ALTER TABLE jobs ADD COLUMN source_platform TEXT DEFAULT 'manual';
ALTER TABLE jobs ADD COLUMN source_job_id TEXT;
ALTER TABLE jobs ADD COLUMN last_verified_at TIMESTAMPTZ;

-- Add click tracking
CREATE TABLE job_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id),
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES users(id),
  ip_address INET,
  user_agent TEXT
);
```

### API Endpoints
```javascript
// GET /api/jobs - Enhanced with source filtering
// POST /api/jobs/track-click - Click tracking
// GET /api/admin/job-stats - Import statistics
// POST /api/admin/refresh-jobs - Manual refresh trigger
```

### Environment Variables
```env
# JobSpy Configuration
JOBSPY_ENABLED=true
JOBSPY_MAX_DAILY_REQUESTS=1000
JOBSPY_RATE_LIMIT_MS=2000

# Upwork API
UPWORK_CLIENT_ID=your_client_id
UPWORK_CLIENT_SECRET=your_client_secret
UPWORK_ACCESS_TOKEN=your_access_token

# Job Import Settings
JOB_IMPORT_ENABLED=true
JOB_RETENTION_DAYS=90
MIN_CONTRACT_SCORE=0.7
```

## Risk Management

### Legal Risks
- Monitor for cease & desist requests
- Implement immediate takedown capabilities
- Maintain legal counsel contact for ToS issues
- Regular compliance audits

### Technical Risks
- Rate limiting monitoring and automatic backoff
- External API failure handling
- Data quality degradation alerts
- System performance monitoring

### Business Risks
- Job relevance quality tracking
- User engagement monitoring
- Competitor response preparation
- Revenue impact assessment

## Success Measurement

### KPIs
- **Job Volume**: 1000+ active contract positions
- **Quality Score**: 90%+ contract relevance
- **User Engagement**: 20% increase in daily active users
- **Click-Through**: 15%+ external application rate
- **Source Reliability**: 95%+ uptime across all sources

### Monitoring Dashboard
Real-time tracking of:
- Job import rates by source
- Contract relevance scores
- External URL validity
- User click-through rates
- System performance metrics
- Legal compliance status

This implementation plan provides a systematic approach to building a comprehensive contract job aggregation system while maintaining legal compliance and data quality standards.