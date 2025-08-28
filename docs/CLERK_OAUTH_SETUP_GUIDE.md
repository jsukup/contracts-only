# Complete Clerk OAuth Setup Guide for ContractsOnly

## Overview
This guide provides step-by-step instructions for setting up Clerk authentication with Google OAuth for ContractsOnly development environment using the existing development instance `evident-oriole-24.clerk.accounts.dev`.

**Note**: LinkedIn OAuth implementation has been deferred. This guide focuses only on Google OAuth setup.

## Table of Contents
1. [Clerk Dashboard Setup](#1-clerk-dashboard-setup)
2. [Google OAuth Setup](#2-google-oauth-setup)
3. [Supabase Configuration](#3-supabase-configuration)
4. [Environment Variables](#4-environment-variables)
5. [Testing & Validation](#5-testing--validation)

---

## 1. Clerk Dashboard Setup

### Step 1.1: Access Existing Clerk Application
1. Go to [clerk.com](https://clerk.com) and login
2. Select existing application: **"ContractsOnly"** 
3. Development instance: **"evident-oriole-24.clerk.accounts.dev"**
4. Current authentication methods:
   - ✅ Email address
   - ✅ Google (to be configured)
   - ⏸️ LinkedIn (deferred)
   - ✅ Username (optional)

### Step 1.2: Configure Application URLs
In Clerk Dashboard → **Settings** → **Paths**:

**Development Configuration:**
```
Home URL: http://localhost:3000
Sign-in URL: http://localhost:3000/sign-in
Sign-up URL: http://localhost:3000/sign-up
After sign-in URL: http://localhost:3000/dashboard
After sign-up URL: http://localhost:3000/onboarding
```

**Production Configuration (when ready):**
```
Home URL: https://contracts-only.vercel.app
Sign-in URL: https://contracts-only.vercel.app/sign-in
Sign-up URL: https://contracts-only.vercel.app/sign-up
After sign-in URL: https://contracts-only.vercel.app/dashboard
After sign-up URL: https://contracts-only.vercel.app/onboarding
```

### Step 1.3: Add Development & Production URLs
In Clerk Dashboard → **Settings** → **Domains**:

**Current Development:**
- `http://localhost:3000`
- `https://evident-oriole-24.clerk.accounts.dev` (development instance domain)

**Future Production (when ready):**
- `https://contracts-only.vercel.app`
- `https://www.contracts-only.com` (if custom domain is configured)

### Step 1.4: API Keys (Already Configured)
The API keys are already configured in the environment:
- **Publishable key**: `pk_test_ZXZpZGVudC1vcmlvbGUtMjQuY2xlcmsuYWNjb3VudHMuZGV2JA`
- **Secret key**: `sk_test_WTuugoNSF9qdjV20utRsxEBGyQVU9mSJfUr6EUAY9R`

These keys are set in the `.env` file and work with the development instance.

### Step 1.5: Enable User Metadata
In Clerk Dashboard → **Settings** → **User & Authentication** → **Email, Phone, Username**:
1. Scroll to **User Metadata**
2. Enable **Public metadata**
3. Add schema for role:
```json
{
  "role": "string" // Values: "USER" or "RECRUITER"
}
```

---

## 2. Google OAuth Setup

### Step 2.1: Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Project name: **"ContractsOnly"**

### Step 2.2: Enable Google+ API
1. Go to **APIs & Services** → **Library**
2. Search for **"Google+ API"**
3. Click **Enable**

### Step 2.3: Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **"+ CREATE CREDENTIALS"** → **OAuth client ID**
3. If prompted, configure OAuth consent screen first:
   - User Type: **External**
   - App name: **ContractsOnly**
   - User support email: **info@contracts-only.com**
   - Developer contact: **info@contracts-only.com**
   - Authorized domains: 
     - `contracts-only.com`
     - `contracts-only.vercel.app`
     - `clerk.com`
   - Scopes: Add these scopes:
     - `openid`
     - `email`
     - `profile`

### Step 2.4: Create OAuth Client
1. Application type: **Web application**
2. Name: **ContractsOnly Clerk**
3. Authorized JavaScript origins:
   ```
   http://localhost:3000
   https://evident-oriole-24.clerk.accounts.dev
   https://contracts-only.vercel.app
   ```
4. Authorized redirect URIs:
   ```
   https://evident-oriole-24.clerk.accounts.dev/v1/oauth_callback
   ```
   (Get the exact URL from Clerk Dashboard → **Social Connections** → **Google** → **Redirect URI**)
5. Click **Create**
6. Copy **Client ID** and **Client Secret**

### Step 2.5: Add to Clerk
1. In Clerk Dashboard → **User & Authentication** → **Social Connections**
2. Click **Google**
3. Toggle **ON**
4. Enter:
   - Client ID: `[Your Google Client ID]`
   - Client Secret: `[Your Google Client Secret]`
5. Click **Save**

---

## 3. Supabase Configuration

### Step 3.1: Update Authentication Settings
Since we're using Clerk for auth but Supabase for database:

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Disable all providers (we're using Clerk now)

### Step 3.2: Database Configuration (Already Done)
The Supabase database is already configured to work with Clerk:
- Database connection strings are in environment variables
- User sync API route is implemented at `/api/profile/create`
- Users table accepts Clerk user IDs

### Step 3.3: Add Webhook for User Sync (Optional for Development)
For production deployment:
1. In Clerk Dashboard → **Webhooks**
2. Add endpoint: `https://contracts-only.vercel.app/api/webhooks/clerk`
3. Select events:
   - `user.created`
   - `user.updated`
   - `user.deleted`

For development, user sync happens through the onboarding flow.

---

## 4. Environment Variables

### Step 4.1: Development Environment (Already Configured)
The `.env` file is already configured with the necessary variables:

```env
# Clerk Authentication (PRIMARY AUTH SYSTEM)
# Development Instance: evident-oriole-24.clerk.accounts.dev
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZXZpZGVudC1vcmlvbGUtMjQuY2xlcmsuYWNjb3VudHMuZGV2JA
CLERK_SECRET_KEY=sk_test_WTuugoNSF9qdjV20utRsxEBGyQVU9mSJfUr6EUAY9R

# Clerk Redirect URLs (work with development instance)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Supabase Database (keeping for data storage)
NEXT_PUBLIC_SUPABASE_URL=https://jrdwwhwckbkplnnalhox.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[configured]
SUPABASE_SERVICE_ROLE_KEY=[configured]

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CONTACT_EMAIL=info@contracts-only.com
NEXT_PUBLIC_COMPANY_NAME=ContractsOnly
NEXT_PUBLIC_COMPANY_PHONE=+1-415-805-6535
```

### Step 4.2: Production Environment (For Future Deployment)
A `.env.production` template is available with production-ready configuration using production Clerk keys (`pk_live_` and `sk_live_`).

---

## 5. Testing & Validation

### Step 5.1: Start Development Server
```bash
cd /root/contracts-only
npm run dev
```

### Step 5.2: Test Email/Password Authentication
1. Go to http://localhost:3000
2. Click **Get Started** or **Sign Up**
3. Enter email and password
4. Complete authentication
5. Should redirect to `/onboarding` for role selection
6. Select role (Contractor/Recruiter)
7. Should redirect to `/dashboard`

### Step 5.3: Test Google OAuth (After Google OAuth Setup)
1. Go to http://localhost:3000
2. Click **Get Started** or **Sign Up**
3. Click **Continue with Google**
4. Complete Google authentication
5. Should redirect to `/onboarding` for role selection
6. Select role (Contractor/Recruiter)
7. Should redirect to `/dashboard`

### Step 5.4: Verify User Creation
1. Check Clerk Dashboard → **Users** (should see new user)
2. Check Supabase → **Table Editor** → **users** (should see synced profile)
3. User ID in Supabase should match Clerk user ID

### Step 5.5: Test Protected Routes
1. Sign out from the application
2. Try accessing http://localhost:3000/dashboard (should redirect to `/sign-in`)
3. Sign in with your account
4. Access http://localhost:3000/dashboard (should work)

### Step 5.6: Test Role-Based Access
1. Sign in as Contractor (USER role)
   - Should see contractor dashboard
   - Can browse jobs
2. Sign in as Recruiter
   - Should see recruiter dashboard
   - Can post jobs

---

## Troubleshooting

### Common Issues:

#### 1. OAuth Redirect Mismatch
**Error**: "Redirect URI mismatch"
**Solution**: Ensure redirect URIs in Google/LinkedIn exactly match Clerk's callback URL

#### 2. User Not Syncing to Supabase
**Check**:
- API route `/api/profile/create` is working
- Supabase service role key is set in Vercel
- Check Vercel function logs

#### 3. OAuth Button Not Working
**Check**:
- OAuth provider is enabled in Clerk Dashboard
- Client ID/Secret are correctly entered in Clerk
- Domain is authorized in OAuth provider settings

#### 4. Production URLs Not Working
**Check**:
- All production URLs are added to Clerk domains
- Vercel environment variables are set for production
- DNS is properly configured if using custom domain

---

## Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Use production keys** in production - Not test keys
3. **Enable MFA** in Clerk Dashboard for admin access
4. **Rotate keys regularly** - Especially if exposed
5. **Monitor webhooks** - Check for failed webhook deliveries
6. **Use HTTPS everywhere** - Never use HTTP in production
7. **Validate user roles** - Always check on server-side

---

## Support Resources

- **Clerk Documentation**: https://clerk.com/docs
- **Clerk Support**: support@clerk.com
- **Google OAuth Docs**: https://developers.google.com/identity/protocols/oauth2
- **LinkedIn OAuth Docs**: https://docs.microsoft.com/en-us/linkedin/shared/authentication/authentication
- **Supabase Docs**: https://supabase.com/docs
- **ContractsOnly Support**: info@contracts-only.com

---

## Next Steps

1. **Complete Google OAuth Setup**: Follow Google Cloud Console configuration
2. **Test Authentication Flows**: Email/password and Google OAuth
3. **Verify Database Sync**: Check user creation in Supabase
4. **Prepare for Production**: When ready, upgrade to production Clerk instance

## Support Resources

- **Clerk Documentation**: https://clerk.com/docs
- **Clerk Support**: support@clerk.com
- **Google OAuth Docs**: https://developers.google.com/identity/protocols/oauth2
- **ContractsOnly Support**: info@contracts-only.com

---

*Last Updated: December 2024*
*Version: 1.0 (Development Environment)*
*Environment: evident-oriole-24.clerk.accounts.dev*