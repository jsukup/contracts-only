# Requirements Specification: ContractsOnly

## Executive Summary

ContractsOnly is a specialized job board platform focused exclusively on short-term contract positions with hourly rates. The platform connects contractors with companies and staffing agencies seeking temporary talent, providing transparency in rates, contract terms, and mutual ratings. Inspired by 4dayweek.io's clean interface and user experience, ContractsOnly will differentiate itself by focusing on the contract job market with features tailored to hourly workers and short-term engagements.

## Problem Statement

The current job market lacks a dedicated platform for contract-only positions where:
- Contractors can easily find short-term, hourly-rate opportunities
- Companies can quickly source temporary talent without long-term commitments
- Transparency exists around hourly rates and contract terms
- Both parties can build reputation through mutual ratings
- The focus is exclusively on contract work, not full-time positions

## Solution Overview

A modern web application built with Next.js 15 that provides:
- Dedicated job board for contract positions only
- Advanced filtering by hourly rate, duration, and contract type
- Contractor profiles with portfolios and availability status
- Company profiles for both direct employers and staffing agencies
- Two-way rating system for completed contracts
- Automated job matching and notifications
- External application redirection (no internal ATS)

## Functional Requirements

### 1. User Management

#### 1.1 User Types
- **Contractors**: Individual professionals seeking contract work
- **Employers**: Companies directly hiring contractors
- **Agencies**: Staffing firms posting on behalf of clients

#### 1.2 Authentication & Registration
- Email/password authentication
- OAuth integration (Google, LinkedIn)
- Role-based access control
- Email verification required

#### 1.3 Profile Management
- **Contractor Profiles**:
  - Skills and expertise
  - Hourly rate expectations
  - Portfolio/work samples
  - Certifications
  - Availability status (available now, specific date, not looking)
  - Location and remote preferences
  - Contract type preferences (W2, 1099, Corp-to-Corp)
  
- **Company Profiles**:
  - Company description
  - Industry and size
  - Typical contract lengths
  - Payment terms
  - Remote work policies
  - Past contractor reviews

### 2. Job Management

#### 2.1 Job Posting
- Title and description
- Hourly rate range (min-max)
- Contract duration
- Contract type (W2, 1099, Corp-to-Corp)
- Required skills (tagged)
- Location/remote options
- Urgency indicator
- External application URL
- Auto-expiration after 30 days

#### 2.2 Job Search & Discovery
- Search by keyword, skills, location
- Filter by:
  - Hourly rate range
  - Contract duration (< 3 months, 3-6 months, 6-12 months)
  - Contract type
  - Remote/hybrid/onsite
  - Posted date
  - Company type (direct/agency)
- Sort by: relevance, date, rate, duration
- Save searches for alerts

#### 2.3 Job Application Flow
- "Apply Now" redirects to company's external URL
- Track click-through analytics
- No internal application management

### 3. Matching & Notifications

#### 3.1 Job Matching Algorithm
- Match contractors to jobs based on:
  - Skills overlap (60% minimum match)
  - Hourly rate compatibility
  - Location/remote preferences
  - Availability timing
  - Contract type preferences

#### 3.2 Notification System
- Email alerts for matching jobs
- Daily/weekly digest options
- Urgent position instant alerts
- Job expiration reminders (employers)
- Profile view notifications

### 4. Rating & Review System

#### 4.1 Two-Way Ratings
- 5-star rating scale
- Written review (optional)
- Rating categories:
  - Technical skills
  - Communication
  - Timeliness
  - Overall experience

#### 4.2 Review Display
- Aggregate ratings on profiles
- Individual review listings
- Response capability
- Flag inappropriate content

### 5. Search & Discovery Features

#### 5.1 Advanced Search
- Multi-field search
- Boolean operators
- Saved search criteria
- Search history
- "Similar jobs" recommendations

#### 5.2 Browse Features
- Category browsing
- Featured jobs section
- Recently posted
- Ending soon
- High-paying contracts

## Technical Requirements

### Architecture

#### Frontend
- **Framework**: Next.js 15 with App Router
- **UI Library**: React 18+
- **Styling**: Tailwind CSS
- **State Management**: Zustand or Context API
- **Form Handling**: React Hook Form
- **Validation**: Zod

#### Backend
- **API**: Next.js Route Handlers
- **Database**: PostgreSQL
- **ORM**: Supabase SDK
- **Authentication**: NextAuth.js
- **File Storage**: AWS S3 (portfolios, resumes)
- **Email Service**: SendGrid or AWS SES
- **Search**: PostgreSQL full-text search (upgrade to Elasticsearch later)

#### Infrastructure
- **Hosting**: Vercel (frontend) + Supabase/Railway (database)
- **CDN**: Vercel Edge Network
- **Monitoring**: Vercel Analytics + Sentry
- **CI/CD**: GitHub Actions

### Data Model

#### Core Entities
```typescript
User {
  id, email, password_hash, type, created_at, verified
}

ContractorProfile {
  user_id, hourly_rate_min, hourly_rate_max, 
  skills[], availability_status, available_date,
  portfolio_url, bio, location, remote_preference
}

Company {
  name, type, website, description, size,
  industry, payment_terms, verified
}

Job {
  company_id, title, description, hourly_rate_min,
  hourly_rate_max, contract_duration, contract_type,
  skills_required[], location, remote_type,
  application_url, posted_at, expires_at, status
}

Review {
  reviewer_id, reviewee_id, job_id, rating,
  review_text, created_at
}

JobMatch {
  job_id, contractor_id, match_score, notified_at
}
```

### Performance Requirements
- Page load time < 2 seconds
- Search results < 500ms
- 99.9% uptime SLA
- Support 10,000 concurrent users
- Database query optimization
- CDN for static assets

### Security Requirements
- HTTPS everywhere
- SQL injection prevention (Supabase RLS policies)
- XSS protection (React escaping)
- CSRF tokens for forms
- Rate limiting on API endpoints
- Two-factor authentication option
- GDPR/CCPA compliance
- PII encryption at rest

## Implementation Priorities

### Phase 1: MVP (Weeks 1-4)
1. User authentication and profiles
2. Basic job posting and search
3. Company profiles
4. Job filtering and sorting
5. External application redirects
6. Basic email notifications

### Phase 2: Enhanced Features (Weeks 5-8)
1. Contractor portfolios
2. Two-way rating system
3. Advanced search capabilities
4. Job matching algorithm
5. Automated notifications
6. Saved searches

### Phase 3: Scale & Optimize (Weeks 9-12)
1. Performance optimization
2. Enhanced matching algorithm
3. Analytics dashboard
4. API for job syndication
5. Mobile app planning
6. Bulk import placeholders

## Acceptance Criteria

### User Stories Completed
- ✓ As a contractor, I can create a profile and showcase my skills
- ✓ As an employer, I can post contract jobs with hourly rates
- ✓ As a contractor, I can search and filter jobs by my criteria
- ✓ As an employer, I can view contractor profiles and ratings
- ✓ As a user, I can leave reviews after contract completion
- ✓ As a contractor, I receive notifications for matching jobs

### Quality Metrics
- All pages load in < 2 seconds
- Search returns relevant results
- Mobile responsive on all devices
- Accessibility WCAG 2.1 AA compliant
- Cross-browser compatibility
- Error handling for all user flows

## Assumptions

1. **No payment processing**: Platform connects parties but doesn't handle payments
2. **English-only initially**: Internationalization deferred to future phase
3. **External applications**: No internal ATS or application tracking
4. **Email primary channel**: SMS and push notifications are future features
5. **Manual moderation**: Automated content moderation is a future enhancement
6. **Single currency**: USD only for initial launch

## Risks & Mitigation

### Technical Risks
- **Database scaling**: Start with PostgreSQL, plan for sharding
- **Search performance**: Index optimization, consider Elasticsearch migration
- **Email deliverability**: Use reputable service, implement DKIM/SPF

### Business Risks
- **Low initial inventory**: Partner with agencies for launch content
- **Trust building**: Implement verification badges, quality reviews
- **Spam prevention**: Rate limiting, captcha, moderation tools

## Success Metrics

### Launch Targets (Month 1)
- 100 job postings
- 500 contractor registrations
- 50 company accounts
- 1000 job applications (click-throughs)

### Growth Targets (Month 6)
- 1000 active job postings
- 10,000 contractor profiles
- 500 company accounts
- 50,000 monthly job views
- 4.5+ average platform rating