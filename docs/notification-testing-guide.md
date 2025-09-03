# 📧 Email Notification Testing Guide

## Overview
This guide explains how to test all email notification features in ContractsOnly using the provided test scripts and dummy data.

## Prerequisites

1. **Environment Variables**: Ensure these are set in your `.env` file:
```env
# Email Service
RESEND_API_KEY=re_[your-resend-api-key]
FROM_EMAIL=info@contracts-only.com

# Security Secrets (use the generated ones)
CRON_SECRET=Ec74zlwojcbO9xpZGI5iIpQXTA+3GlOExF5LOYuizYU=
ADMIN_SECRET=Cn6JBJE+XRwsJCCKayQid7SylKlA+N2riKkyqmKNm1M=

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

2. **Development Server**: Start the Next.js development server:
```bash
npm run dev
```

## Step 1: Seed Test Data

First, create dummy job postings and test users:

```bash
node scripts/seed-test-notifications.js
```

This creates:
- **4 Test Users**:
  - 2 Contractors with different skill sets
  - 2 Recruiters from different companies
- **9 Job Postings**:
  - Jobs posted today (0 days old)
  - Jobs from this week (1-6 days old)
  - Older jobs (7-30 days old)
- **Sample Applications** with different statuses
- **Click Analytics** for recruiter reports

### Test Data Characteristics

| Job Age | Count | Should Appear in Weekly Digest? |
|---------|-------|----------------------------------|
| Today (0 days) | 2 | ✅ Yes |
| This Week (1-6 days) | 3 | ✅ Yes |
| Last Week (7-14 days) | 2 | ❌ No (too old) |
| Older (15-30 days) | 2 | ❌ No (too old) |

## Step 2: Run Email Tests

Execute the interactive test script:

```bash
node scripts/test-notifications.js
```

This provides an interactive menu to test each notification type.

## Testing Each Notification Type

### 1. Weekly Contractor Digest 📨

**What it tests**: Sends personalized job recommendations to contractors based on their skills.

**How matching works**:
- Matches contractor skills with job requirements
- Only includes jobs from the past 7 days
- Filters by contractor's rate preferences
- Considers location preferences (remote vs on-site)

**Expected Results**:
- Contractor 1 (React/TypeScript skills) should receive:
  - "Senior React Developer" job
  - "Full Stack JavaScript Developer" job
  - "GraphQL API Developer" job
- Contractor 2 (AWS/Docker skills) should receive:
  - "Python Backend Engineer" job
  - "DevOps Engineer" job

**Test Command**: Choose option `2` in the test menu

### 2. Recruiter Performance Reports 📊

**What it tests**: Sends weekly analytics to recruiters about their job postings.

**Metrics included**:
- Total views per job
- Click-through rates
- Application counts
- Conversion rates
- Top performing jobs

**Expected Results**:
- Recruiters receive reports only for their own postings
- Metrics based on the past 7 days
- Includes job click analytics we seeded

**Test Command**: Choose option `3` in the test menu

### 3. Application Status Updates 🔔

**What it tests**: Notifies applicants when their application status changes.

**Status transitions**:
- `PENDING` → `REVIEWED`: "Your application is being reviewed"
- `REVIEWED` → `INTERVIEW`: "You've been selected for an interview!"
- `INTERVIEW` → `ACCEPTED`: "Congratulations! Your application was accepted"
- `INTERVIEW` → `REJECTED`: "Application update"

**To test**:
1. Get an application ID from your database:
```sql
SELECT id, status FROM job_applications LIMIT 1;
```
2. Update the `applicationId` in the test script
3. Run the status update test

**Test Command**: Choose option `4` in the test menu

### 4. CRON Job Automation ⏰

**What it tests**: The automated weekly notification schedule.

**Schedule**:
- Runs every Monday at 9:00 AM UTC
- Processes both contractor digests and recruiter reports
- Includes retry logic for failed emails

**Test Command**: Choose option `5` in the test menu

### 5. Marketing Campaigns 📣

**What it tests**: Bulk email campaigns with unsubscribe management.

**Features**:
- GDPR-compliant with unsubscribe links
- Respects user email preferences
- Can target specific user segments

**Test Command**: Choose option `6` in the test menu

### 6. System Monitoring 📈

**What it tests**: Health checks and performance metrics.

**Metrics provided**:
- Email send success rate
- Average processing time
- Queue status
- Error rates
- System health score

**Test Command**: Choose option `7` in the test menu

## Manual Testing Scenarios

### Scenario 1: Job Matching Accuracy
1. Create a contractor with specific skills (e.g., only "Python")
2. Create jobs with varying skill requirements
3. Run the weekly digest
4. Verify only Python-related jobs are included

### Scenario 2: Date Filtering
1. Create jobs with different posting dates
2. Run the weekly digest
3. Verify only jobs from the past 7 days are included

### Scenario 3: Rate Matching
1. Set contractor's desired rate to $80-$100/hour
2. Create jobs with various rate ranges
3. Verify only jobs within or overlapping the rate range are matched

### Scenario 4: Location Preferences
1. Create a contractor who only wants remote work
2. Create both remote and on-site jobs
3. Verify only remote jobs are included in their digest

## Monitoring Email Delivery

### Using Resend Dashboard
1. Log into your Resend account
2. Navigate to the "Emails" section
3. Monitor:
   - Delivery status
   - Open rates
   - Click rates
   - Bounce rates

### Local Testing with Test Mode
Set `testMode: true` in the API calls to:
- Process all logic without sending actual emails
- See what would be sent in the console logs
- Verify recipient lists and content

## Troubleshooting

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| "Unauthorized" errors | Check CRON_SECRET and ADMIN_SECRET in .env |
| No emails received | Verify RESEND_API_KEY and FROM_EMAIL |
| Wrong jobs in digest | Check job posting dates and skill matching |
| Missing test users | Run seed script again |
| Server not reachable | Ensure `npm run dev` is running |

### Debug Mode

Enable detailed logging by setting in your API routes:
```javascript
const DEBUG = true // Set in notification route files
```

### Database Queries for Verification

Check test users:
```sql
SELECT id, email, role, job_alerts_enabled 
FROM users 
WHERE email LIKE 'test-%';
```

Check recent jobs:
```sql
SELECT id, title, created_at, poster_id 
FROM jobs 
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

Check user skills:
```sql
SELECT u.email, s.name 
FROM users u
JOIN user_skills us ON u.id = us.user_id
JOIN skills s ON us.skill_id = s.id
WHERE u.email LIKE 'test-%';
```

## Production Testing Checklist

Before deploying to production:

- [ ] All test scenarios pass locally
- [ ] Email templates render correctly
- [ ] Unsubscribe links work
- [ ] Rate limiting is configured
- [ ] Error handling works (test with invalid data)
- [ ] Monitoring endpoints return correct metrics
- [ ] CRON authentication is secure
- [ ] Email content is optimized (spam score < 3)
- [ ] Mobile responsiveness verified
- [ ] Database queries are optimized

## Advanced Testing

### Load Testing
```javascript
// Test with many users
for (let i = 0; i < 100; i++) {
  await createTestUser(`contractor-${i}@test.com`)
}
// Run digest to test performance
```

### Email Template Testing
1. Use Litmus or Email on Acid for cross-client testing
2. Test in major email clients:
   - Gmail
   - Outlook
   - Apple Mail
   - Mobile clients

### Webhook Testing (for email events)
```bash
# Use ngrok for local webhook testing
ngrok http 3000
# Configure webhook URL in Resend dashboard
```

## Security Testing

- [ ] Verify CRON endpoints require authentication
- [ ] Test with invalid/expired tokens
- [ ] Verify rate limiting prevents abuse
- [ ] Check for SQL injection in user inputs
- [ ] Verify email content is properly escaped

## Next Steps

After successful testing:
1. Deploy to staging environment
2. Run tests against staging
3. Monitor for 24-48 hours
4. Deploy to production
5. Set up production monitoring alerts

---

## Quick Test Commands

```bash
# 1. Seed data
node scripts/seed-test-notifications.js

# 2. Run interactive tests
node scripts/test-notifications.js

# 3. Test specific endpoint (weekly digest)
curl -X POST http://localhost:3000/api/notifications/weekly-digest \
  -H "Authorization: Bearer Cn6JBJE+XRwsJCCKayQid7SylKlA+N2riKkyqmKNm1M=" \
  -H "Content-Type: application/json" \
  -d '{"testMode": true}'

# 4. Check system health
curl http://localhost:3000/api/cron/notifications?health=true \
  -H "Authorization: Bearer Ec74zlwojcbO9xpZGI5iIpQXTA+3GlOExF5LOYuizYU="
```

---

**Remember**: Always test in `testMode: true` first to verify logic before sending actual emails!