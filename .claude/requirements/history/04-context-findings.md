# Context Findings for ContractsOnly

## Technology Stack Recommendations (Based on 4dayweek.io Analysis)

### Frontend Architecture
- **Framework**: Next.js 15 with App Router
  - Server Components for optimal performance
  - Built-in SEO capabilities
  - Excellent search and filtering support
- **Styling**: Tailwind CSS
  - Responsive, mobile-first design
  - Component-based approach similar to 4dayweek.io
- **State Management**: React Context API or Zustand
  - For filter states, search parameters
  - User session management

### Backend Architecture
- **API**: Next.js Route Handlers (app/api)
  - RESTful endpoints for job operations
  - Server-side data fetching
- **Database**: PostgreSQL with Prisma ORM
  - Structured data for jobs, companies, contractors
  - Full-text search capabilities
  - Efficient filtering and pagination
- **Search**: PostgreSQL full-text search or Elasticsearch
  - Advanced search for skills, job titles
  - Faceted search implementation
- **Authentication**: NextAuth.js
  - Support for multiple provider types
  - Role-based access (contractors, employers, agencies)

## Contractor Job Board Best Practices (2024-2025)

### Rate Management
- **Hourly Rate Ranges**: Display 25th, 50th, 75th percentile rates
- **Rate Calculator**: Help contractors convert hourly to annual
- **Market Rates**: Show competitive rates by skill and location
- **Rate Transparency**: Clear display of rates without hidden fees

### Contract Features
- **Duration Filtering**: 
  - Short-term (< 3 months)
  - Medium-term (3-6 months)
  - Long-term (6-12 months)
  - Contract-to-hire options
- **Contract Types**:
  - W2 Employee
  - 1099 Independent Contractor
  - Corp-to-Corp
  - International contractors

### Trust & Verification
- **Two-way Rating System**: 
  - Star ratings (1-5)
  - Written reviews
  - Completion rate metrics
- **Profile Verification**:
  - Email verification
  - LinkedIn integration
  - Portfolio verification
  - Skills assessment badges

## Key Implementation Patterns

### Search & Filtering (Next.js App Router)
```typescript
// Using searchParams in Server Components
export default async function JobsPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const filters = await searchParams;
  // Implement filtering logic
}
```

### Data Fetching Strategy
- Server Components for initial load
- Client-side filtering for interactive updates
- Pagination with URL state management
- Cache strategies for job listings

### SEO Optimization
- Dynamic metadata for job listings
- Structured data (JobPosting schema)
- Sitemap generation for all jobs
- Open Graph tags for social sharing

## Database Schema Considerations

### Core Entities
1. **Users**
   - type: contractor | employer | agency
   - profile completion status
   - verification status

2. **Jobs**
   - hourly_rate_min, hourly_rate_max
   - contract_duration
   - contract_type
   - remote_type (remote, hybrid, onsite)
   - skills_required (array)
   - urgent_hiring (boolean)

3. **Companies**
   - company_type (direct, agency)
   - typical_contract_length
   - payment_terms
   - verified status

4. **Contractor Profiles**
   - hourly_rate
   - availability_date
   - skills (array)
   - portfolio_items
   - certifications

5. **Reviews**
   - reviewer_id, reviewee_id
   - rating (1-5)
   - contract_id
   - review_text

## Performance Considerations

### Optimization Strategies
- Static generation for company profiles
- ISR (Incremental Static Regeneration) for job listings
- Edge caching for search results
- Lazy loading for images and non-critical content
- Virtual scrolling for long job lists

### Scalability Planning
- Database indexing on frequently queried fields
- Redis caching for session management
- CDN for static assets
- Queue system for email notifications
- Rate limiting for API endpoints

## Compliance & Security

### Data Protection
- GDPR compliance for EU contractors
- CCPA compliance for California residents
- Secure storage of contractor information
- PII encryption at rest and in transit

### Platform Security
- Two-factor authentication option
- Rate limiting on authentication endpoints
- SQL injection prevention (Prisma ORM)
- XSS protection (React's built-in escaping)
- CSRF tokens for form submissions

## Monetization Insights

### Revenue Models
1. **Job Posting Fees**
   - Basic listing: $X per 30 days
   - Featured listing: $X premium
   - Urgent hiring badge: $X addon

2. **Subscription Plans**
   - Unlimited postings for agencies
   - Bulk posting discounts
   - Premium contractor profiles

3. **Value-Added Services**
   - Background checks
   - Skills assessments
   - Contract templates
   - Escrow services (future)

## Integration Requirements

### Third-Party Services
- **Email**: SendGrid or AWS SES for notifications
- **Analytics**: Google Analytics 4 + custom events
- **Payment**: Stripe for subscription billing
- **Storage**: AWS S3 for file uploads (resumes, portfolios)
- **Background Checks**: Checkr or similar API
- **Calendar**: Google Calendar API for interview scheduling

## Mobile Considerations

### Responsive Design Priorities
- Mobile-first job search experience
- Swipe gestures for job browsing
- One-tap apply functionality
- Push notifications for job alerts
- Progressive Web App capabilities

## Launch Strategy Recommendations

### MVP Features (Phase 1)
1. Job posting and search
2. Basic contractor profiles
3. Company profiles
4. Email notifications
5. Simple filtering

### Growth Features (Phase 2)
1. Advanced search with AI matching
2. In-platform messaging
3. Video introductions
4. Skills assessments
5. API for job syndication