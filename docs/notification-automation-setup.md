# 📧 Notification Automation & Background Job Setup

This document outlines how to set up automated notification scheduling for ContractsOnly using various CRON services and deployment platforms.

## 🎯 Overview

The notification system includes:
- **Contractor Weekly Digests**: Personalized job recommendations sent weekly
- **Recruiter Performance Reports**: Weekly analytics and performance insights
- **Automated Scheduling**: Background job execution via CRON services

## 🔧 API Endpoint Configuration

### Primary Endpoint
```
POST /api/cron/notifications
Authorization: Bearer [CRON_SECRET]
```

### Test Endpoint
```
GET /api/cron/notifications?test=true
Authorization: Bearer [CRON_SECRET]
```

## 🔐 Environment Variables

Add these to your `.env.production` and Vercel environment variables:

```env
# CRON Authentication (Required)
# Generate secure random strings using: openssl rand -base64 32
CRON_SECRET=your-secure-random-string-here
ADMIN_SECRET=your-admin-secret-here

# Application URL (Required for internal API calls)
NEXTAUTH_URL=https://contracts-only.vercel.app

# Email Service - Resend (Required)
RESEND_API_KEY=re_your-resend-api-key
FROM_EMAIL=info@contracts-only.com

# Database (Required - Already configured)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Generating Secure Secrets

For production, generate secure random strings for CRON_SECRET and ADMIN_SECRET:

```bash
# Generate CRON_SECRET
openssl rand -base64 32

# Generate ADMIN_SECRET
openssl rand -base64 32
```

Example output:
```
CRON_SECRET=kJ8Q2wX9mP3nL7vB5tY1aZ6cR4gH0sD+
ADMIN_SECRET=xM4pN7kL2wQ9vB3tY5aZ1cR6gH8sD0f+
```

## 🚀 Deployment Options

### Option 1: Vercel Cron Jobs (Recommended)

Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/notifications",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

**Setup Steps:**
1. Add `vercel.json` to your project root
2. Set `CRON_SECRET` in Vercel environment variables
3. Deploy to Vercel
4. Cron jobs will run automatically every Monday at 9 AM UTC

### Option 2: GitHub Actions

Create `.github/workflows/weekly-notifications.yml`:

```yaml
name: Weekly Notifications
on:
  schedule:
    - cron: '0 9 * * 1'  # Monday 9 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  send-notifications:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Notification Cron
        run: |
          curl -X POST https://your-domain.vercel.app/api/cron/notifications \\
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \\
            -H "Content-Type: application/json"
```

**Setup Steps:**
1. Add the workflow file to your repository
2. Set `CRON_SECRET` as a GitHub repository secret
3. Enable GitHub Actions in your repository

### Option 3: External CRON Services

#### Using Cron-job.org
1. Sign up at [cron-job.org](https://cron-job.org)
2. Create a new cron job:
   - **URL**: `https://your-domain.vercel.app/api/cron/notifications`
   - **Method**: POST
   - **Schedule**: `0 9 * * 1` (Every Monday 9 AM)
   - **Headers**: 
     ```
     Authorization: Bearer your-cron-secret
     Content-Type: application/json
     ```

#### Using EasyCron
1. Sign up at [easycron.com](https://www.easycron.com)
2. Create a new cron job:
   - **URL**: `https://your-domain.vercel.app/api/cron/notifications`
   - **Cron Expression**: `0 9 * * 1`
   - **HTTP Method**: POST
   - **HTTP Headers**: `Authorization: Bearer your-cron-secret`

### Option 4: AWS EventBridge (Advanced)

Create a Lambda function that calls your endpoint:

```javascript
const https = require('https');

exports.handler = async (event) => {
  const options = {
    hostname: 'your-domain.vercel.app',
    path: '/api/cron/notifications',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      'Content-Type': 'application/json'
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
};
```

## 🧪 Testing

### Manual Testing
```bash
# Test endpoint configuration
curl -X GET "https://your-domain.vercel.app/api/cron/notifications?test=true" \\
  -H "Authorization: Bearer your-cron-secret"

# Execute notifications manually
curl -X POST "https://your-domain.vercel.app/api/cron/notifications" \\
  -H "Authorization: Bearer your-cron-secret" \\
  -H "Content-Type: application/json"
```

### Local Development Testing
```bash
# Set environment variable
export CRON_SECRET=development-secret

# Test with curl
curl -X POST "http://localhost:3000/api/cron/notifications" \\
  -H "Authorization: Bearer development-secret" \\
  -H "Content-Type: application/json"
```

## 📊 Monitoring & Logging

### Success Response
```json
{
  "success": true,
  "message": "All automated notification jobs completed successfully",
  "results": {
    "weeklyDigests": { "success": true, "error": null },
    "weeklyReports": { "success": true, "error": null },
    "timestamp": "2024-01-15T09:00:00.000Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Some automated notification jobs encountered errors",
  "results": {
    "weeklyDigests": { "success": true, "error": null },
    "weeklyReports": { "success": false, "error": "SendGrid API error" },
    "timestamp": "2024-01-15T09:00:00.000Z"
  }
}
```

### Monitoring Tools
- **Vercel Functions**: Check function logs in Vercel dashboard
- **Uptime Monitoring**: Use services like UptimeRobot or Pingdom
- **Error Tracking**: Integration with Sentry or similar services

## 🔧 Customization

### Scheduling Frequency
Current schedule: **Every Monday at 9 AM UTC**

To change the schedule, modify the cron expression:
- Daily: `0 9 * * *`
- Twice weekly: `0 9 * * 1,4` (Monday & Thursday)
- Monthly: `0 9 1 * *` (First day of month)

### Time Zone Considerations
- All schedules are in UTC by default
- For local time zones, calculate the UTC offset
- Example: 9 AM EST = 2 PM UTC = `0 14 * * 1`

### Email Batch Limits
The system respects email service rate limits:
- SendGrid: 100 emails/second (default)
- Resend: 10 emails/second (default)
- Batch processing prevents rate limit violations

## 🚨 Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check `CRON_SECRET` environment variable
   - Verify Authorization header format

2. **500 Internal Server Error**
   - Check application logs
   - Verify database connection
   - Confirm email service configuration

3. **No Emails Sent**
   - Check user notification preferences in database
   - Verify `FROM_EMAIL` is configured
   - Confirm email service API keys

4. **Partial Success (207 Status)**
   - Some jobs succeeded, others failed
   - Check the `results` object for specific errors
   - Common causes: email service downtime, database connectivity

### Debug Mode
Add debug logging by setting `DEBUG=true` in environment variables.

### Contact Support
For persistent issues:
1. Check Vercel function logs
2. Verify all environment variables are set
3. Test the endpoint manually with curl
4. Review email service quotas and limits

## 🔄 Maintenance

### Regular Tasks
- Monitor email delivery rates
- Check for bounced emails
- Review user notification preferences
- Update CRON secrets periodically (recommended: every 6 months)

### Performance Optimization
- Monitor function execution time
- Implement batch processing for large user bases
- Consider database query optimization for large datasets
- Set up alerting for failed job executions

## 📈 Scaling Considerations

For larger user bases (1000+ users):
1. **Database Optimization**: Add indexes for notification queries
2. **Batch Processing**: Implement user segmentation
3. **Rate Limiting**: Respect email service limits
4. **Error Handling**: Implement retry logic with exponential backoff
5. **Monitoring**: Set up comprehensive alerting and metrics

## 🔗 Related Documentation
- [Email Templates Guide](./email-templates.md)
- [Notification Preferences](./notification-preferences.md)
- [Database Schema](./database-schema.md)
- [Deployment Guide](./deployment.md)