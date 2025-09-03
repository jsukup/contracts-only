# Phase 5: Comprehensive Requirements Specification

## Problem Statement

ContractsOnly has a well-developed notification infrastructure (70% complete) with database schema, UI components, and email framework. However, the core notification creation logic, email templates, and automated scheduling are missing, preventing users from receiving job alerts, application updates, and weekly digest emails.

## Solution Overview

Complete the notification system implementation by:
1. Adding notification creation triggers to existing API endpoints
2. Implementing missing email templates and content generation
3. Setting up automated background processing for weekly digests
4. Ensuring both in-app and email notifications work seamlessly

## Functional Requirements

### FR1: Contractor Job Alerts
- **Trigger**: When a new job is posted and matches contractor skills/preferences
- **Matching**: Use existing `JobMatchingEngine` with 70+ score threshold
- **Delivery**: Both in-app notification and email (if enabled)
- **Timing**: Immediate processing with hourly email batching
- **Content**: Job title, company, match score, key reasons for match

### FR2: Application Status Notifications  
- **Trigger**: When application status changes to `INTERVIEW`, `ACCEPTED`, or `REJECTED`
- **Delivery**: Both in-app notification and email (if enabled)
- **Content**: Simple status update, job title, company name
- **Exclusions**: No recruiter contact info or feedback messages in notifications

### FR3: Contractor Weekly Digest
- **Trigger**: Weekly scheduled job (every Monday 8 AM user timezone)
- **Content**: Personalized job recommendations using existing matching engine
- **Exclusions**: No market insights or analytics
- **Delivery**: Email only (if enabled)
- **Personalization**: Based on user skills, preferences, and recent activity

### FR4: Recruiter Job Performance Summaries
- **Trigger**: Weekly scheduled job (every Monday 9 AM)  
- **Content**: Basic metrics - applications received, job views, top performing jobs
- **Exclusions**: No conversion rate analysis
- **Delivery**: Email only (if enabled)
- **Integration**: Extend existing weekly click reports system

### FR5: Marketing Emails
- **Trigger**: Manual/scheduled campaigns
- **Content**: Product updates, tips, platform announcements
- **Delivery**: Email only (if enabled)
- **Segmentation**: Separate content for contractors vs recruiters

### FR6: In-App Notification Management
- **Features**: Real-time display, mark as read, delete, bulk actions
- **Status**: Already implemented via `NotificationCenter` component
- **Integration**: Connect to notification creation triggers above

## Technical Requirements

### TR1: API Integration Points
- **Job Creation API** (`src/app/api/jobs/route.ts`): Add job alert triggers
- **Application Status API** (`src/app/api/applications/[applicationId]/route.ts`): Add notification triggers
- **Profile API**: Already handles notification preferences correctly

### TR2: Email System Extension
- **Templates**: Create missing templates for job alerts, application updates, contractor digest
- **Automation**: Extend existing `EmailAutomationEngine` class
- **Queue Processing**: Use existing email job processing system
- **Batching**: Implement hourly batching for job alerts

### TR3: Background Job Scheduling
- **Weekly Digests**: CRON job or Vercel Edge Function
- **Email Queue**: Regular processing of pending email jobs
- **Performance**: Batch processing to handle scale

### TR4: Database Operations
- **Schema**: Use existing notification tables and JSONB preferences
- **Queries**: Optimize matching queries for notification volume
- **Indexes**: Ensure proper indexing for notification queries

### TR5: Notification Creation Helper
- **File**: `src/lib/notifications.ts` (new)
- **Purpose**: Centralized notification creation with dual delivery (in-app + email)
- **Pattern**: 
  ```typescript
  await createNotification({
    userId, type, title, message, data,
    sendEmail: true // Based on user preferences
  })
  ```

## Implementation Hints and Patterns

### Job Alert Implementation Pattern
```typescript
// In job creation API after successful creation
const candidates = await JobMatchingEngine.getCandidatesForJob(jobId, 50, 70)
for (const match of candidates) {
  await createNotification({
    userId: match.userId,
    type: 'job_match',
    title: 'New Job Match!',
    message: `${job.title} at ${job.company} matches your skills (${match.overallScore}% match)`,
    data: { jobId, url: `/jobs/${jobId}`, matchScore: match.overallScore }
  })
}
```

### Application Status Change Pattern  
```typescript
// In application status update API
if (['INTERVIEW', 'ACCEPTED', 'REJECTED'].includes(newStatus)) {
  await createNotification({
    userId: application.applicant_id,
    type: 'application',  
    title: 'Application Update',
    message: `Your application for ${job.title} is now ${newStatus.toLowerCase()}`,
    data: { applicationId, jobId, url: `/applications/${applicationId}` }
  })
}
```

### Weekly Digest Pattern
```typescript
// Weekly CRON job
const activeContractors = await getContractorsWithDigestEnabled()
for (const contractor of activeContractors) {
  const matches = await JobMatchingEngine.getMatchesForUser(contractor.id, 5, 60)
  if (matches.length > 0) {
    await EmailAutomationEngine.scheduleContractorWeeklyDigest(contractor.id, matches)
  }
}
```

## Acceptance Criteria

### AC1: Job Alerts
- ✅ New matching jobs trigger notifications within 5 minutes
- ✅ Notifications use 70+ match score threshold  
- ✅ Email batching occurs hourly, not per job
- ✅ Users receive both in-app and email (if enabled)
- ✅ In-app notifications link to job details

### AC2: Application Updates
- ✅ Status changes to INTERVIEW/ACCEPTED/REJECTED trigger notifications
- ✅ Status changes to PENDING/REVIEWED do not trigger notifications
- ✅ Notifications contain basic info without recruiter details
- ✅ Users can click to view full application details

### AC3: Weekly Digest
- ✅ Contractors with enabled digest receive weekly job recommendations
- ✅ Content is personalized based on skills and preferences
- ✅ Digest includes 3-5 top job matches with scores
- ✅ Email includes unsubscribe link and preference management

### AC4: Performance
- ✅ Job alert processing completes within 5 minutes of job posting
- ✅ Email queue processes within 10 minutes of scheduling
- ✅ Weekly digest generation completes within 2 hours
- ✅ System handles 100+ concurrent job postings without delays

### AC5: User Experience
- ✅ Notification preferences in settings page work correctly (already implemented)
- ✅ NotificationCenter displays new notifications in real-time (already implemented) 
- ✅ Email templates are professional and mobile-responsive
- ✅ Unsubscribe links work correctly for all email types

## Assumptions for Implementation

1. **Email Service**: Continue using SendGrid with existing configuration
2. **Scheduling**: Use Vercel Edge Functions or external CRON for weekly jobs
3. **Real-time**: WebSocket updates not required initially, polling acceptable
4. **Templates**: HTML email templates following existing design patterns
5. **Testing**: Manual testing for initial implementation, automated tests for regression
6. **Performance**: Current user base size allows for synchronous processing
7. **Monitoring**: Use existing error logging, add notification-specific metrics

## Out of Scope

- Push notifications to mobile devices
- SMS notifications
- Advanced market analytics and insights
- Conversion rate tracking and analysis
- A/B testing of notification content
- Machine learning for notification optimization
- Third-party integrations (Slack, Teams, etc.)
- Custom notification frequency controls beyond on/off