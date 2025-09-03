# Comprehensive Notification System Test Plan

## Overview

This test plan covers comprehensive testing of the ContractsOnly user notification system, including Job Alerts, Weekly Digest, email preferences, and Supabase integration. The system implements dual delivery (in-app + email), background job scheduling, and performance under load.

## Core Features to Test

### 1. Job Alerts System
- **Threshold-based matching**: 70+ match score threshold for immediate notifications
- **Hourly email batching**: Aggregated notifications sent every hour
- **Real-time in-app notifications**: Immediate display in notification center
- **Match score accuracy**: Validation of job matching algorithm

### 2. Application Status Updates
- **Status filtering**: Only INTERVIEW/ACCEPTED/REJECTED notifications
- **Dual delivery**: Both in-app and email based on user preferences
- **Timing accuracy**: Immediate delivery when status changes

### 3. Weekly Digest System
- **Personalized recommendations**: Based on user profile and job matching
- **Background scheduling**: Automated weekly delivery
- **Content relevance**: Job recommendations with match scores

### 4. Recruiter Performance Summaries
- **Click tracking metrics**: External link clicks and basic analytics
- **Weekly report generation**: Automated summary emails
- **Data aggregation**: Correct calculation of performance metrics

### 5. Email Preference Management
- **Granular controls**: Individual notification type toggles
- **Real-time updates**: Immediate preference changes
- **Fallback handling**: Console provider for development/testing

## Test Implementation Strategy

### A. Unit Tests (40% of coverage)

#### A1. Job Alert Matching Tests
```typescript
// Test file: tests/unit/notifications/job-alert-matching.test.ts
describe('Job Alert Matching System', () => {
  test('filters jobs with 70+ match score threshold')
  test('calculates match scores accurately')
  test('handles skill-based matching correctly')
  test('processes rate compatibility')
  test('evaluates location and remote preferences')
  test('considers availability status')
  test('accounts for competition levels')
})
```

**Data Setup Requirements:**
- Mock user profiles with various skill sets, rates, and preferences
- Job postings with different requirements and compensation ranges
- Match score calculation test cases with expected outcomes

#### A2. Email Preference Management Tests
```typescript
// Test file: tests/unit/notifications/email-preferences.test.ts
describe('Email Preference Management', () => {
  test('updates contractor notification preferences')
  test('updates recruiter notification preferences')
  test('validates JSONB structure integrity')
  test('handles malformed preference data')
  test('applies default preferences for new users')
  test('migrates legacy preference formats')
})
```

**Data Setup Requirements:**
- User records with various preference configurations
- JSONB test data with valid and invalid structures
- Migration scenarios from old to new preference formats

#### A3. Email Service Provider Tests
```typescript
// Test file: tests/unit/notifications/email-sender.test.ts
describe('Email Service Provider', () => {
  test('selects correct primary provider (Resend/SendGrid)')
  test('falls back to secondary provider on failure')
  test('handles console provider in development')
  test('validates email format and required fields')
  test('processes email templates correctly')
  test('manages provider-specific error handling')
})
```

**Data Setup Requirements:**
- Mock environment variables for different provider configurations
- Test email addresses and content
- Provider API response mocks (success/failure scenarios)

### B. Integration Tests (35% of coverage)

#### B1. Notification API Integration Tests
```typescript
// Test file: tests/integration/notifications/notification-api.test.ts
describe('Notification API Integration', () => {
  test('GET /api/notifications - fetches user notifications with auth')
  test('GET /api/notifications?unread=true - filters unread notifications')
  test('PATCH /api/notifications - marks notifications as read')
  test('PATCH /api/notifications - deletes notifications')
  test('handles pagination with limit and offset')
  test('validates user authorization for notification access')
  test('returns proper error responses for invalid requests')
})
```

**Data Setup Requirements:**
- Test users with Clerk authentication
- Database notifications with various types and statuses
- Bearer token setup for API authentication

#### B2. Database Integration Tests
```typescript
// Test file: tests/integration/notifications/database-operations.test.ts
describe('Notification Database Operations', () => {
  test('creates notifications in database')
  test('queries notifications with RLS policies')
  test('updates notification status correctly')
  test('handles concurrent notification operations')
  test('manages notification_queue table operations')
  test('processes JSONB preference queries efficiently')
})
```

**Data Setup Requirements:**
- Clean test database state for each test
- User records with different roles and preferences
- Notification records with various types and relationships

#### B3. Job Matching Integration Tests
```typescript
// Test file: tests/integration/notifications/job-matching-integration.test.ts
describe('Job Matching Integration', () => {
  test('generates job alerts based on user profile matching')
  test('processes batch matching for multiple users')
  test('handles edge cases in matching algorithm')
  test('validates match score calculations against real data')
  test('processes skill level alignment correctly')
  test('handles rate range overlaps and gaps')
})
```

**Data Setup Requirements:**
- Realistic user profiles with skills, rates, and preferences
- Job postings with various requirements and specifications
- Expected match score outcomes for validation

### C. End-to-End Tests (20% of coverage)

#### C1. Complete Notification Flow Tests
```typescript
// Test file: tests/e2e/notifications/notification-flow.spec.ts
describe('Complete Notification Flow', () => {
  test('user receives job alert for matching job posting')
  test('application status change triggers notification')
  test('weekly digest email is generated and sent')
  test('recruiter receives performance summary')
  test('user can manage notification preferences')
  test('notifications appear in user dashboard')
})
```

**Test Scenarios:**
- Job posting creation triggers alerts for matching contractors
- Application status updates send notifications to applicants
- Weekly digest generation and delivery process
- Recruiter performance summary compilation and sending
- User preference changes affect notification delivery

#### C2. Email Delivery Tests
```typescript
// Test file: tests/e2e/notifications/email-delivery.spec.ts
describe('Email Delivery End-to-End', () => {
  test('job alert emails are sent with correct content')
  test('application status emails contain relevant information')
  test('weekly digest emails include personalized recommendations')
  test('recruiter performance emails show accurate metrics')
  test('email preferences are respected in delivery')
  test('fallback provider handles primary provider failures')
})
```

**Test Environment Setup:**
- Test email provider configuration (Console provider for CI)
- Mock SMTP server for email capture and validation
- Email template rendering verification

### D. Performance Tests (5% of coverage)

#### D1. Load Testing
```typescript
// Test file: tests/performance/notifications/load-testing.test.ts
describe('Notification System Load Testing', () => {
  test('handles 100+ concurrent job postings for matching')
  test('processes batch notifications within time limits')
  test('maintains response times under load')
  test('manages database connection pooling efficiently')
  test('handles email queue processing under high volume')
})
```

**Performance Benchmarks:**
- Job matching: <500ms for single user against 100 jobs
- Notification API: <200ms response time for notification fetching
- Email processing: <10 seconds for batch of 50 emails
- Database queries: <100ms for notification CRUD operations

#### D2. Memory and Resource Tests
```typescript
// Test file: tests/performance/notifications/resource-usage.test.ts
describe('Resource Usage Testing', () => {
  test('memory usage remains stable during batch processing')
  test('database connections are properly released')
  test('email provider connections are managed efficiently')
  test('background job processing doesn\'t cause memory leaks')
})
```

## Specific Test Scenarios

### Scenario 1: Job Alert Generation and Delivery
```typescript
describe('Job Alert Generation Scenario', () => {
  const testScenario = async () => {
    // 1. Create contractor with specific skills and preferences
    const contractor = await createTestContractor({
      skills: ['React', 'TypeScript', 'Node.js'],
      hourlyRateMin: 80,
      hourlyRateMax: 120,
      isRemoteOnly: true,
      availability: 'available'
    })

    // 2. Create job posting that matches (should score 70+)
    const job = await createTestJobPosting({
      title: 'Senior React Developer',
      skills: [
        { name: 'React', required: true, level: 'advanced' },
        { name: 'TypeScript', required: false, level: 'intermediate' }
      ],
      hourlyRateMin: 90,
      hourlyRateMax: 110,
      isRemote: true
    })

    // 3. Trigger job matching system
    const matches = await JobMatchingEngine.getCandidatesForJob(job.id)
    
    // 4. Verify match score meets threshold
    expect(matches[0].overallScore).toBeGreaterThanOrEqual(70)

    // 5. Verify notification is created
    const notifications = await getNotificationsForUser(contractor.id)
    expect(notifications).toHaveLength(1)
    expect(notifications[0].type).toBe('job_match')

    // 6. Verify email is queued/sent (if preferences allow)
    const emailQueue = await getEmailQueueForUser(contractor.id)
    expect(emailQueue).toContainMatchingEmail('job_alert')
  }
})
```

### Scenario 2: Application Status Update Notifications
```typescript
describe('Application Status Update Scenario', () => {
  const testScenario = async () => {
    // 1. Create application with PENDING status
    const application = await createTestApplication({
      jobId: 'test-job-1',
      applicantId: 'test-user-1',
      status: 'PENDING'
    })

    // 2. Update status to INTERVIEW (should trigger notification)
    await updateApplicationStatus(application.id, 'INTERVIEW')

    // 3. Verify notification is created
    const notifications = await getNotificationsForUser('test-user-1')
    const statusNotification = notifications.find(n => 
      n.type === 'application' && 
      n.data?.applicationId === application.id
    )
    expect(statusNotification).toBeDefined()
    expect(statusNotification?.message).toContain('interview')

    // 4. Verify email is sent if user preferences allow
    const emailSent = await checkEmailSent('test-user-1', 'application_update')
    expect(emailSent).toBe(true)

    // 5. Test that PENDING->REVIEWING doesn't trigger notification
    await updateApplicationStatus(application.id, 'REVIEWING')
    const newNotificationCount = await getNotificationCountForUser('test-user-1')
    expect(newNotificationCount).toBe(1) // Should not increase
  }
})
```

### Scenario 3: Weekly Digest Generation
```typescript
describe('Weekly Digest Generation Scenario', () => {
  const testScenario = async () => {
    // 1. Create contractor with specific preferences
    const contractor = await createTestContractor({
      contractor_notifications: {
        weekly_digest: true,
        job_alerts_enabled: true
      }
    })

    // 2. Create multiple job postings with varying match scores
    const jobs = await Promise.all([
      createTestJobPosting({ /* high match */ }),
      createTestJobPosting({ /* medium match */ }),
      createTestJobPosting({ /* low match - should be filtered out */ })
    ])

    // 3. Run weekly digest generation
    const digestResult = await generateWeeklyDigest(contractor.id)

    // 4. Verify digest contains appropriate job recommendations
    expect(digestResult.recommendations).toHaveLength(2) // Only high and medium matches
    expect(digestResult.recommendations[0].matchScore).toBeGreaterThan(70)

    // 5. Verify email is sent with personalized content
    const emailSent = await checkEmailSent(contractor.id, 'weekly_digest')
    expect(emailSent).toBe(true)

    // 6. Verify email content includes match reasons and job details
    const emailContent = await getLastEmailContent(contractor.email)
    expect(emailContent).toContain('personalized recommendations')
    expect(emailContent).toContain(jobs[0].title)
  }
})
```

### Scenario 4: Performance Under Load
```typescript
describe('Performance Under Load Scenario', () => {
  const testScenario = async () => {
    // 1. Create 100 contractors with diverse profiles
    const contractors = await createMultipleTestContractors(100)

    // 2. Create 50 job postings
    const jobs = await createMultipleTestJobs(50)

    // 3. Measure time for batch job matching
    const startTime = Date.now()
    const batchResults = await JobMatchingEngine.generateDailyMatches(
      contractors.map(c => c.id),
      5 // max matches per user
    )
    const matchingTime = Date.now() - startTime

    // 4. Verify performance benchmarks
    expect(matchingTime).toBeLessThan(10000) // Less than 10 seconds
    expect(batchResults.size).toBeGreaterThan(0) // Some matches found

    // 5. Verify notification creation performance
    const notificationStartTime = Date.now()
    await createNotificationsFromMatches(batchResults)
    const notificationTime = Date.now() - notificationStartTime
    
    expect(notificationTime).toBeLessThan(5000) // Less than 5 seconds

    // 6. Verify email queue processing
    const emailQueueSize = await getEmailQueueSize()
    expect(emailQueueSize).toBeGreaterThan(0)
    expect(emailQueueSize).toBeLessThan(500) // Reasonable queue size
  }
})
```

## Error Handling and Edge Cases

### Error Handling Test Cases
```typescript
describe('Notification System Error Handling', () => {
  test('handles email provider failures gracefully')
  test('manages database connection errors')
  test('processes malformed notification data')
  test('handles user authentication failures')
  test('manages notification queue overflow')
  test('recovers from job matching algorithm errors')
  test('handles missing user preferences gracefully')
  test('manages concurrent notification updates')
})
```

### Edge Cases
```typescript
describe('Notification System Edge Cases', () => {
  test('user with no skills receives generic job recommendations')
  test('job with no required skills matches all available contractors')
  test('user with conflicting preferences (e.g., remote but specific location)')
  test('notification preferences changed during email processing')
  test('duplicate job postings don\'t create duplicate notifications')
  test('deleted users don\'t receive notifications')
  test('archived jobs don\'t trigger new alerts')
})
```

## Data Setup and Test Environment

### Test Database Schema
```sql
-- Test data setup for notification system testing
INSERT INTO users (id, email, name, role, contractor_notifications, recruiter_notifications) VALUES
  ('test-contractor-1', 'contractor1@test.com', 'Test Contractor 1', 'USER', '{"job_alerts_enabled": true, "weekly_digest": true}', null),
  ('test-recruiter-1', 'recruiter1@test.com', 'Test Recruiter 1', 'RECRUITER', null, '{"weekly_click_reports": true}');

INSERT INTO jobs (id, title, description, poster_id, hourly_rate_min, hourly_rate_max, is_remote, is_active) VALUES
  ('test-job-1', 'React Developer', 'Looking for experienced React developer', 'test-recruiter-1', 80, 120, true, true);

INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at) VALUES
  ('test-notif-1', 'test-contractor-1', 'job_match', 'New Job Match', 'Found a great match for you', false, NOW());
```

### Mock Services Setup
```typescript
// Mock email service for testing
export const mockEmailService = {
  sentEmails: [] as any[],
  send: jest.fn().mockImplementation(async (options) => {
    mockEmailService.sentEmails.push(options)
    return { messageId: `test_${Date.now()}`, provider: 'console' }
  }),
  reset: () => {
    mockEmailService.sentEmails = []
    mockEmailService.send.mockClear()
  }
}

// Mock job matching engine
export const mockJobMatchingEngine = {
  calculateMatch: jest.fn(),
  getMatchesForUser: jest.fn(),
  getCandidatesForJob: jest.fn(),
  generateDailyMatches: jest.fn()
}
```

## Test Execution Plan

### Phase 1: Unit Tests (Week 1)
1. **Day 1-2**: Job matching algorithm tests
2. **Day 3-4**: Email preference management tests  
3. **Day 5**: Email service provider tests

### Phase 2: Integration Tests (Week 2)
1. **Day 1-2**: Database integration tests
2. **Day 3-4**: API integration tests
3. **Day 5**: Job matching integration tests

### Phase 3: End-to-End Tests (Week 3)
1. **Day 1-2**: Complete notification flow tests
2. **Day 3-4**: Email delivery tests
3. **Day 5**: User preference management tests

### Phase 4: Performance and Load Tests (Week 4)
1. **Day 1-2**: Load testing implementation
2. **Day 3**: Performance benchmarking
3. **Day 4**: Memory and resource usage tests
4. **Day 5**: Final optimization and validation

## Success Criteria

### Functional Requirements
- [ ] All notification types are delivered correctly
- [ ] Job matching algorithm produces accurate scores (±5% tolerance)
- [ ] Email preferences are respected in all scenarios
- [ ] Application status notifications only trigger for relevant statuses
- [ ] Weekly digests contain personalized, relevant content

### Performance Requirements
- [ ] Job matching: <500ms per user for 100 jobs
- [ ] Notification API: <200ms average response time
- [ ] Email processing: <10 seconds for 50 emails
- [ ] System handles 100+ concurrent operations
- [ ] Memory usage remains stable during batch processing

### Quality Requirements
- [ ] 95%+ test coverage for notification system
- [ ] Zero data loss during notification processing
- [ ] Graceful degradation during service failures
- [ ] Proper error handling and logging
- [ ] Security: Users only access their own notifications

### Integration Requirements
- [ ] Supabase RLS policies properly enforced
- [ ] Clerk authentication integration works correctly
- [ ] Email providers handle failover appropriately
- [ ] Database transactions maintain consistency
- [ ] Background job scheduling functions reliably

## Test Automation and CI/CD Integration

### GitHub Actions Workflow
```yaml
name: Notification System Tests
on: [push, pull_request]
jobs:
  notification-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Run notification system tests
        env:
          NODE_ENV: test
          TEST_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          TEST_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SERVICE_ROLE_KEY }}
        run: |
          npm run test:notifications -- --coverage --ci
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          flags: notifications
```

## Monitoring and Observability

### Test Metrics to Track
- Test execution time trends
- Code coverage percentage
- Test failure rates by category
- Performance benchmark trends
- Integration test success rates

### Production Monitoring
- Notification delivery success rates
- Email provider failover frequency
- Job matching algorithm performance
- User engagement with notifications
- System resource utilization

This comprehensive test plan ensures the notification system is thoroughly tested across all dimensions: functionality, performance, integration, and user experience. The implementation should be done incrementally, with each phase building upon the previous one to create a robust and reliable notification system.