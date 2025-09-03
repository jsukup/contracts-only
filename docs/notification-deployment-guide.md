# 🚀 Notification System Deployment Guide

Complete deployment guide for the ContractsOnly notification system with all environment variables and configuration.

## 📋 Pre-Deployment Checklist

- ✅ Resend account set up with `info@contracts-only.com` verified
- ✅ All notification code implemented and tested
- ✅ Vercel project configured
- ⚠️ Environment variables need to be set (see below)

## 🔐 Environment Variables for Vercel

Add these environment variables in your Vercel dashboard (Settings > Environment Variables):

### Required for Notification System
```env
# CRON Authentication - Generated secure secrets
CRON_SECRET=Ec74zlwojcbO9xpZGI5iIpQXTA+3GlOExF5LOYuizYU=
ADMIN_SECRET=Cn6JBJE+XRwsJCCKayQid7SylKlA+N2riKkyqmKNm1M=

# Email Service - Resend (Primary)
RESEND_API_KEY=re_[your-actual-resend-api-key]
FROM_EMAIL=info@contracts-only.com

# Application URL for CRON jobs (already configured in Vercel)
NEXT_PUBLIC_APP_URL=https://contracts-only.vercel.app
```

### Already Configured (Verify these exist)
```env
# Database
NEXT_PUBLIC_SUPABASE_URL=[already-set]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[already-set]
SUPABASE_SERVICE_ROLE_KEY=[already-set]

# Authentication - Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=[already-set]
CLERK_SECRET_KEY=[already-set]
```

## 🚀 Deployment Steps

### 1. Set Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Select the ContractsOnly project
3. Go to Settings > Environment Variables
4. Add the new environment variables from above
5. Set all to "Production, Preview, and Development"

### 2. Get Your Resend API Key

1. Go to [Resend Dashboard](https://resend.com/api-keys)
2. Create a new API key for ContractsOnly
3. Copy the key (starts with `re_`)
4. Add it as `RESEND_API_KEY` in Vercel

### 3. Verify Domain in Resend

1. In Resend dashboard, go to Domains
2. Add `contracts-only.com` as a domain
3. Verify DNS settings
4. Confirm `info@contracts-only.com` can send emails

### 4. Deploy to Production

```bash
# Push your changes
git add .
git commit -m "feat: complete notification system implementation"
git push origin main

# Vercel will automatically deploy
```

## 🧪 Testing After Deployment

### 1. Test CRON Health Check
```bash
curl "https://contracts-only.vercel.app/api/cron/notifications?health=true"
```
Expected response: System health with all components OK

### 2. Test Manual Weekly Digest
```bash
curl -X POST "https://contracts-only.vercel.app/api/notifications/weekly-digest" \
  -H "Content-Type: application/json"
```

### 3. Test Email Configuration
Visit the admin panel to send a test email (requires ADMIN_SECRET)

## ⏰ CRON Job Verification

The system is configured to run weekly digests every Monday at 9 AM UTC via Vercel CRON jobs.

Verify in Vercel dashboard:
1. Go to Functions tab
2. Look for `/api/cron/notifications` 
3. Check execution logs after Monday 9 AM UTC

## 📊 Monitoring

### Available Monitoring Endpoints

1. **System Health**: `/api/notifications/monitoring?report=health`
2. **Performance Metrics**: `/api/notifications/monitoring?report=metrics`
3. **Prometheus Export**: `/api/notifications/monitoring?format=prometheus`

### Dashboard Access

Admin dashboard access requires the `ADMIN_SECRET`:
- Marketing campaigns: `/api/marketing/campaigns`
- System monitoring: `/api/notifications/monitoring`

## 🔍 Troubleshooting

### Common Issues

**1. CRON Jobs Not Running**
- Check `CRON_SECRET` is set correctly
- Verify `NEXT_PUBLIC_APP_URL` matches your domain
- Check Vercel function logs

**2. Emails Not Sending**
- Verify `RESEND_API_KEY` is correct
- Check domain verification in Resend
- Confirm `FROM_EMAIL=info@contracts-only.com`

**3. Database Errors**
- Verify Supabase environment variables
- Check database table structure
- Review connection permissions

### Debug Commands

```bash
# Check system health
curl "https://contracts-only.vercel.app/api/cron/notifications?test=true" \
  -H "Authorization: Bearer Ec74zlwojcbO9xpZGI5iIpQXTA+3GlOExF5LOYuizYU="

# Test email configuration
curl -X POST "https://contracts-only.vercel.app/api/email/test" \
  -H "Content-Type: application/json" \
  -d '{"to":"your-email@example.com"}'
```

## 📈 Performance Optimization

### Rate Limits
- Emails sent in batches of 10
- 1 second delay between batches
- Respects Resend rate limits

### Database Optimization
- Queries use appropriate indexes
- Batch processing for large user sets
- Error retry logic with exponential backoff

## 🔒 Security Considerations

- CRON endpoints protected with Bearer token authentication
- Admin endpoints require separate ADMIN_SECRET
- User preferences respect GDPR unsubscribe requirements
- All email addresses validated before sending

## 📧 Email Templates

All emails use consistent branding:
- **From**: ContractsOnly <info@contracts-only.com>
- **Reply-To**: info@contracts-only.com
- **Unsubscribe**: Automatic links included
- **Mobile responsive** templates

## 🎯 Success Metrics

Monitor these metrics in the dashboard:
- Email delivery rate (target: >95%)
- User engagement rate (target: >25% open rate)
- Unsubscribe rate (target: <2%)
- System uptime (target: >99.9%)

## 🚨 Emergency Procedures

If the system fails:

1. **Disable CRON jobs** by removing `CRON_SECRET`
2. **Check Vercel function logs** for error details
3. **Verify email service status** at Resend dashboard
4. **Roll back deployment** if needed via Vercel dashboard

## 📞 Support

For issues with:
- **Email delivery**: Check Resend dashboard and logs
- **CRON execution**: Check Vercel function logs
- **Database issues**: Check Supabase dashboard
- **Authentication**: Verify Clerk configuration

---

## ✅ Deployment Complete!

Once all environment variables are set and the deployment is successful, your notification system will:

- ✅ Send personalized weekly digests to contractors every Monday
- ✅ Send performance reports to recruiters weekly
- ✅ Handle job alerts automatically when new jobs match user skills
- ✅ Send application status updates for interviews, offers, and rejections
- ✅ Provide marketing campaign management with GDPR compliance
- ✅ Monitor system performance and health automatically

🎉 **The ContractsOnly notification system is now fully operational!**