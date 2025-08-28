# 🚀 Clerk Development Quick Setup Reference

## 📋 Setup Checklist

### 1️⃣ Clerk Dashboard (5 minutes)
- [x] App already created: "ContractsOnly"
- [x] Development instance: `evident-oriole-24.clerk.accounts.dev`
- [x] Enable: Email, Google (**LinkedIn deferred**)
- [ ] Add domains:
  - `http://localhost:3000`
  - `https://evident-oriole-24.clerk.accounts.dev`
- [ ] Set redirect URLs:
  - After sign-in: `/dashboard`
  - After sign-up: `/onboarding`
- [x] API keys already configured in .env

### 2️⃣ Google OAuth (15 minutes)
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com)
- [ ] Create/select project "ContractsOnly"
- [ ] Enable Google+ API
- [ ] Create OAuth 2.0 credentials:
  - Type: Web application
  - Name: ContractsOnly Development
- [ ] Add authorized origins:
  - `http://localhost:3000`
  - `https://evident-oriole-24.clerk.accounts.dev`
- [ ] Add redirect URI:
  - `https://evident-oriole-24.clerk.accounts.dev/v1/oauth_callback`
- [ ] Copy Client ID & Secret
- [ ] Add to Clerk Dashboard → Social → Google

### 3️⃣ LinkedIn OAuth (**DEFERRED**)
LinkedIn OAuth implementation has been postponed. Focus on Google OAuth only for now.

### 4️⃣ Supabase Updates (Already Done)
- [x] Keep existing database
- [x] Supabase auth providers will be disabled
- [x] Service role key configured for user sync

### 5️⃣ Environment Variables (Already Configured)
Development environment is already configured with:

| Variable | Status |
|----------|-------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ Configured |
| `CLERK_SECRET_KEY` | ✅ Configured |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | ✅ Set to `/onboarding` |
| `NEXT_PUBLIC_APP_URL` | ✅ Set to `http://localhost:3000` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | ✅ Set to `info@contracts-only.com` |

Production template available in `.env.production`.

### 6️⃣ Start Development (2 minutes)
```bash
cd /root/contracts-only
npm run dev
```

---

## 🔑 Key URLs You'll Need

### Your App (Development)
- **Local Development**: http://localhost:3000
- **Sign In**: http://localhost:3000/sign-in
- **Sign Up**: http://localhost:3000/sign-up
- **Onboarding**: http://localhost:3000/onboarding
- **Dashboard**: http://localhost:3000/dashboard

### OAuth Redirect URLs (from Clerk)
Get exact URL from Clerk Dashboard → Social Connections → Google → "Redirect URI"

Development format:
```
https://evident-oriole-24.clerk.accounts.dev/v1/oauth_callback
```

---

## 🧪 Quick Test

1. **Test Email/Password Sign Up**:
   - Go to http://localhost:3000
   - Click "Get Started"
   - Enter email and password
   - Complete flow → Should reach onboarding

2. **Test Google Sign Up** (after OAuth setup):
   - Go to http://localhost:3000
   - Click "Get Started"
   - Choose "Continue with Google"
   - Complete flow → Should reach onboarding

3. **Verify in Dashboards**:
   - Check Clerk Dashboard → Users (new user appears)
   - Check Supabase → users table (profile synced)

---

## ⚠️ Common Issues & Fixes

### "Redirect URI mismatch"
→ Copy exact redirect URL from Clerk to OAuth provider

### User not in Supabase
→ Check webhook is configured in Clerk Dashboard
→ Verify `CLERK_WEBHOOK_SECRET` in Vercel

### OAuth button not working
→ Ensure provider is ON in Clerk Dashboard
→ Check Client ID/Secret are saved in Clerk

### Development server not starting
→ Check port 3000 is not in use: `lsof -i:3000`
→ Verify environment variables loaded
→ Run `npm install` to ensure dependencies

---

## 📞 Support Contacts

- **ContractsOnly Email**: info@contracts-only.com
- **ContractsOnly Phone**: +1-415-805-6535
- **Clerk Support**: support@clerk.com
- **Development Help**: Check browser console for errors

---

**Time Estimate**: ~20 minutes (Google OAuth setup)
**Difficulty**: Easy-Medium
**Prerequisites**: Access to Clerk Dashboard, Google Cloud Console
**Environment**: Development only (evident-oriole-24.clerk.accounts.dev)