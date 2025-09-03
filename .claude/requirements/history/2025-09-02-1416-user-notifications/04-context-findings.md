# Phase 3: Targeted Context Findings

Based on discovery answers and deep codebase analysis, here are the key technical findings:

## Existing Infrastructure Analysis

### Job Matching System (Complete)
**File**: `src/lib/matching.ts`
- ✅ **Sophisticated matching algorithm** with weighted scoring (skills 30%, rate 20%, location 15%, etc.)
- ✅ **Real-time match calculation** for both contractors and jobs
- ✅ **Confidence scoring** (high/medium/low) with detailed reasoning
- ✅ **Batch processing methods** for daily/weekly notifications (`generateDailyMatches`)
- **Integration Point**: Can be used directly for job alert notifications

### Email Automation Framework (75% Complete)
**File**: `src/lib/email/automation.ts`
- ✅ **Job alert scheduling** logic exists (`scheduleJobAlerts`)
- ✅ **Application confirmation** email system
- ✅ **Weekly digest** framework for employers
- ✅ **Email queue processing** with retry logic
- ❌ **Missing**: Contractor weekly digest implementation
- ❌ **Missing**: Application status update notifications

### Notification Types & Status
**Files**: `src/lib/types.ts`, database schema

#### Contractor Notifications (4 types)
1. ✅ **job_alerts_enabled**: Database ready, matching logic exists, needs trigger
2. ❌ **application_updates**: Database ready, needs implementation 
3. ❌ **weekly_digest**: Database ready, needs content generation
4. ❌ **marketing_emails**: Database ready, needs template system

#### Recruiter Notifications (3 types) 
1. ✅ **weekly_click_reports**: Fully implemented and working
2. ❌ **job_performance_summaries**: Database ready, needs implementation
3. ❌ **marketing_emails**: Database ready, needs template system

### Application Status Change Detection
**Files**: Database schema, API routes
- ✅ **ApplicationStatus enum**: `PENDING`, `REVIEWED`, `INTERVIEW`, `ACCEPTED`, `REJECTED`
- **Discovery Answer**: Only trigger on significant changes (`INTERVIEW`, `ACCEPTED`, `REJECTED`)
- **Current Gap**: No webhooks/triggers on status changes
- **Solution**: Add triggers in job application API routes

### In-App Notification System (Complete UI, Missing Logic)
**File**: `src/components/notifications/NotificationCenter.tsx`
- ✅ **Full UI implementation** with real-time updates
- ✅ **Notification API routes** for CRUD operations
- ✅ **Database schema** with proper relationships
- ❌ **Missing**: Notification creation logic when events occur

## Implementation Patterns Found

### Email Template Pattern
```typescript
// Existing pattern in automation.ts
await this.scheduleEmail({
  type: 'job_alert',
  recipient: user.email,
  data: {
    user: { name: user.name, email: user.email },
    matches: [/* job matches */],
    dashboardUrl: process.env.NEXT_PUBLIC_APP_URL + '/dashboard'
  },
  scheduledFor: new Date(Date.now() + 5 * 60 * 1000)
})
```

### Notification Creation Pattern
```typescript
// Pattern needed for in-app notifications
await supabase
  .from('notifications')
  .insert({
    user_id: userId,
    type: 'job_match',
    title: 'New Job Match!',
    message: `${job.title} at ${job.company} matches your skills`,
    data: { jobId: job.id, url: `/jobs/${job.id}` }
  })
```

## Integration Points Identified

### Job Posting Flow
**File**: `src/app/api/jobs/route.ts` (assumed)
- **Trigger Point**: After job is created and active
- **Action**: Run job matching → Create notifications → Schedule emails

### Application Status Flow  
**File**: `src/app/api/applications/[applicationId]/route.ts`
- **Trigger Point**: When status changes to `INTERVIEW`, `ACCEPTED`, `REJECTED`
- **Action**: Create in-app notification → Send email if enabled

### Weekly Digest Scheduling
**Current**: Recruiter weekly reports working via API endpoint
- **Need**: CRON job or scheduled function to trigger weekly
- **Pattern**: Same as existing weekly reports but for contractors

## Technical Constraints & Requirements

### Immediate Job Alerts (Answer: Yes)
- **Implementation**: Hook into job creation API
- **Matching**: Use existing `JobMatchingEngine.getCandidatesForJob()`
- **Timing**: 5-minute delay (existing pattern)
- **Volume**: Potentially high, need rate limiting

### Personalized Weekly Digest (Answer: Yes) 
- **Content**: Job recommendations using `getMatchesForUser()`
- **Scheduling**: Weekly CRON job (Vercel Edge Functions or external)
- **Template**: New contractor digest template needed

### Selective Application Updates (Answer: No to all changes)
- **Trigger**: Only on `INTERVIEW`, `ACCEPTED`, `REJECTED` status
- **Skip**: `PENDING`, `REVIEWED` status changes
- **Implementation**: Status change webhook in application API

### Dual Notifications (Answer: Yes to in-app + email)
- **Pattern**: Create in-app notification first, then schedule email
- **User Control**: Honor email preferences, always create in-app
- **Performance**: Batch operations for high volume

## Files Requiring Modification

### Core Implementation
1. **`src/app/api/jobs/route.ts`** - Add job alert triggers
2. **`src/app/api/applications/[applicationId]/route.ts`** - Add status change notifications
3. **`src/lib/email/automation.ts`** - Add contractor weekly digest
4. **New: `src/lib/notifications.ts`** - In-app notification creation helpers

### Email Templates
5. **`src/lib/email/templates.ts`** - Add missing templates
6. **New templates needed**: Job alerts, application updates, contractor digest, marketing emails

### Scheduling/Automation
7. **`src/app/api/notifications/weekly-digest/route.ts`** - Contractor digest endpoint
8. **External**: CRON job setup for weekly processing

## Performance Considerations
- **Job alert volume**: Could be high, need batching and rate limiting
- **Database queries**: Optimize matching queries for large user base  
- **Email limits**: SendGrid daily limits, queue management
- **Real-time updates**: Consider WebSocket for in-app notifications