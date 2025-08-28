# Clerk Development Setup Guide for ContractsOnly

## Overview
This guide provides step-by-step instructions for setting up Clerk authentication in the ContractsOnly development environment using the existing development instance: `evident-oriole-24.clerk.accounts.dev`.

## Prerequisites
- ContractsOnly project with Clerk already implemented
- Access to Clerk Dashboard for development instance
- Environment variables configured in `.env`

## Current Development Configuration

### Development Instance Details
- **Clerk Instance**: `evident-oriole-24.clerk.accounts.dev`
- **Environment**: Development only
- **Authentication Methods**: Email/Password + Google OAuth (LinkedIn OAuth deferred)

### Environment Variables (Already Configured)
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
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/onboarding
```

## Development Server Setup

### 1. Start Development Server
```bash
cd /root/contracts-only
npm run dev
```

### 2. Access Application
- **Local Development**: http://localhost:3000
- **Sign In**: http://localhost:3000/sign-in
- **Sign Up**: http://localhost:3000/sign-up
- **Onboarding**: http://localhost:3000/onboarding (after sign-up)
- **Dashboard**: http://localhost:3000/dashboard (after sign-in)

## Testing Authentication Flow

### 1. Email/Password Authentication
1. Go to http://localhost:3000
2. Click "Get Started" or "Sign Up"
3. Enter email and password
4. Complete authentication
5. Should redirect to `/onboarding` for role selection
6. Select role (Contractor/Recruiter)
7. Should redirect to `/dashboard`

### 2. Google OAuth Authentication
1. Go to http://localhost:3000
2. Click "Get Started" or "Sign Up"
3. Click "Continue with Google"
4. Complete Google authentication
5. Should redirect to `/onboarding` for role selection
6. Select role (Contractor/Recruiter)
7. Should redirect to `/dashboard`

## Clerk Dashboard Configuration

### 1. Access Development Instance
- URL: https://dashboard.clerk.com
- Select: `evident-oriole-24` development instance

### 2. Configure URLs
In Clerk Dashboard → **Settings** → **Paths**:
```
Home URL: http://localhost:3000
Sign-in URL: http://localhost:3000/sign-in
Sign-up URL: http://localhost:3000/sign-up
After sign-in URL: http://localhost:3000/dashboard
After sign-up URL: http://localhost:3000/onboarding
```

### 3. Configure Domains
In Clerk Dashboard → **Settings** → **Domains**:
- Add: `http://localhost:3000` (development)
- Add: `https://contracts-only.vercel.app` (when ready for production)

### 4. Configure Google OAuth
In Clerk Dashboard → **User & Authentication** → **Social Connections**:
1. Click **Google**
2. Toggle **ON**
3. Configure with Google Cloud Console credentials (see Google OAuth Setup section)

## Google OAuth Setup

### 1. Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select existing project or create new: **ContractsOnly**

### 2. Enable Google+ API
1. Go to **APIs & Services** → **Library**
2. Search for **Google+ API**
3. Click **Enable**

### 3. Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. If prompted, configure OAuth consent screen:
   - User Type: **External**
   - App name: **ContractsOnly**
   - User support email: **info@contracts-only.com**
   - Developer contact: **info@contracts-only.com**

### 4. Configure OAuth Client
1. Application type: **Web application**
2. Name: **ContractsOnly Development**
3. Authorized JavaScript origins:
   ```
   http://localhost:3000
   https://evident-oriole-24.clerk.accounts.dev
   ```
4. Authorized redirect URIs:
   ```
   https://evident-oriole-24.clerk.accounts.dev/v1/oauth_callback
   ```
   (Get exact URL from Clerk Dashboard → **Social Connections** → **Google** → **Redirect URI**)

### 5. Add Credentials to Clerk
1. Copy **Client ID** and **Client Secret** from Google Cloud Console
2. In Clerk Dashboard → **User & Authentication** → **Social Connections** → **Google**
3. Enter Client ID and Client Secret
4. Click **Save**

## User Roles Configuration

### Role Metadata Structure
ContractsOnly uses Clerk's public metadata to store user roles:
```json
{
  "role": "USER" | "RECRUITER"
}
```

### Setting User Roles
Roles are set during onboarding flow:
1. User completes authentication
2. Redirected to `/onboarding`
3. Selects role (Contractor = USER, Recruiter = RECRUITER)
4. Role saved to Clerk user metadata
5. User profile created in Supabase
6. Redirected to `/dashboard`

## Database Integration

### Supabase User Sync
When users complete onboarding:
1. API call to `/api/profile/create`
2. Creates user record in Supabase `users` table
3. Links Clerk user ID to Supabase user record
4. Stores role and profile information

### Database Schema
```sql
-- users table structure (existing)
CREATE TABLE users (
  id TEXT PRIMARY KEY, -- Clerk user ID
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('USER', 'RECRUITER')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Development Workflow

### 1. Daily Development
```bash
# Start development server
npm run dev

# Test authentication flows
# - Email/password sign up
# - Google OAuth sign up
# - Role selection
# - Dashboard access
```

### 2. Making Changes
```bash
# After code changes
npm run dev  # Server auto-reloads

# Test authentication still works
# Check for errors in console
```

### 3. Database Changes
```bash
# If you modify user schema
# Update API routes in src/app/api/profile/
# Test user creation flow
```

## Troubleshooting

### Common Issues

#### 1. "Clerk not initialized" Error
**Cause**: ClerkProvider not properly set up in layout.tsx
**Check**: Ensure ClerkProvider wraps the entire application in `src/app/layout.tsx`

#### 2. OAuth Redirect Mismatch
**Cause**: Redirect URI in Google Cloud Console doesn't match Clerk's callback URL
**Fix**: Copy exact redirect URI from Clerk Dashboard → Social Connections → Google

#### 3. User Not Redirecting After Sign-up
**Cause**: afterSignUpUrl not configured properly
**Check**: Verify `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding` in .env

#### 4. Role Not Saving
**Cause**: Public metadata not updating
**Check**: 
- Network tab in browser dev tools
- API call to `/api/profile/create`
- Clerk Dashboard → Users → [user] → Metadata

#### 5. Database Connection Issues
**Cause**: Supabase environment variables not set
**Check**: Verify SUPABASE_SERVICE_ROLE_KEY in .env

### Debug Steps
1. Check browser console for errors
2. Check Network tab for failed requests
3. Verify environment variables are loaded
4. Check Clerk Dashboard → Users for user data
5. Check Supabase → Table Editor → users for synced data

## Security Notes

### Development Security
- Development keys are safe to use in local environment
- Never commit `.env` file to version control
- Use test Google OAuth credentials

### Production Preparation
- Production keys must be different from development
- Use production Google OAuth credentials
- Configure production domains in Clerk Dashboard
- Set up webhook for production user sync

## Next Steps

1. **Test Complete Flow**: Sign up → Role selection → Dashboard access
2. **Verify Database Sync**: Check Supabase users table after sign-up
3. **Test Google OAuth**: Complete Google sign-up flow
4. **Prepare for Production**: When ready, follow production deployment guide

---

## Support Resources

- **Clerk Documentation**: https://clerk.com/docs
- **Clerk Support**: support@clerk.com
- **Google OAuth Docs**: https://developers.google.com/identity/protocols/oauth2
- **ContractsOnly Support**: info@contracts-only.com

---

*Last Updated: December 2024*
*Version: 1.0*
*Environment: Development Only*