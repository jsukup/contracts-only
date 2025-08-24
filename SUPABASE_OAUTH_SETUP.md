# SUPABASE GOOGLE OAUTH SETUP INSTRUCTIONS

## ⚠️ CRITICAL: Complete Google OAuth Setup Required

The authentication system has been completely rebuilt. You MUST configure Google OAuth in the Supabase dashboard for authentication to work.

## 🔧 STEP 1: Supabase Dashboard Configuration

### Navigate to Authentication Settings
1. Go to https://supabase.com/dashboard
2. Select your project: **contracts-only** (ID: jrdwwhwckbkplnnalhox)
3. Go to **Authentication** → **Providers**

### Enable Google Provider
1. Find **Google** in the provider list
2. Enable the Google provider
3. Configure the following settings:

**Client ID:** `YOUR_GOOGLE_CLIENT_ID`
**Client Secret:** `YOUR_GOOGLE_CLIENT_SECRET`

> ⚠️ **IMPORTANT**: Replace these placeholders with your actual Google OAuth credentials from Google Cloud Console

### Set Redirect URLs
Configure these exact redirect URLs in the Google provider settings:

**Development:**
- `http://localhost:3000/auth/callback`
- `https://jrdwwhwckbkplnnalhox.supabase.co/auth/v1/callback`

**Production (when deployed):**
- `https://your-domain.com/auth/callback`
- `https://jrdwwhwckbkplnnalhox.supabase.co/auth/v1/callback`

## 🔧 STEP 2: Google Cloud Console Configuration

### Verify OAuth 2.0 Client Settings
1. Go to https://console.cloud.google.com/
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID (the same one you'll use in Supabase)

### Add Authorized Redirect URIs
Ensure these URIs are in your Google OAuth client:

```
https://jrdwwhwckbkplnnalhox.supabase.co/auth/v1/callback
http://localhost:3000/auth/callback
```

## 🔧 STEP 3: Enable Email/Password Authentication

In Supabase Dashboard → Authentication → Settings:
1. **Enable email/password authentication**
2. **Disable email confirmations** (for testing) or configure email templates
3. Set **Site URL** to `http://localhost:3000` (development) or your production domain

## 🔧 STEP 4: Test the Configuration

After completing the setup:

### Test Google OAuth Flow
1. Go to http://localhost:3000
2. Click "Sign Up" 
3. Click "Continue with Google"
4. Complete Google authentication
5. Verify you're redirected to dashboard
6. Check that user profile is created in database

### Test Email/Password Flow  
1. Go to http://localhost:3000/auth/signup
2. Fill out the registration form
3. Submit and verify account creation
4. Test login with created credentials

## 🔧 STEP 5: Verify Database Integration

After successful authentication, verify:

1. **User created in auth.users** (Supabase auth table)
2. **User profile created in public.users** (our app table)
3. **User can access dashboard and protected routes**
4. **User profile displays correctly**

## 🚨 TROUBLESHOOTING

### Common Issues:

**Google OAuth fails with "redirect_uri_mismatch"**
- Verify redirect URIs match exactly in Google Console and Supabase
- Check for trailing slashes or protocol mismatches

**User authenticated but no profile created**
- Check browser console for AuthContext errors
- Verify RLS policies allow user insertion
- Check Supabase logs for database errors

**"Invalid login credentials" error**
- User exists in auth.users but not public.users
- AuthContext should automatically create profile
- Check network tab for failed API calls

### Debug Commands:

```sql
-- Check auth users
SELECT count(*), email FROM auth.users GROUP BY email;

-- Check public users  
SELECT count(*), email FROM public.users GROUP BY email;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'users';
```

## ✅ SUCCESS INDICATORS

Authentication is working correctly when:

1. ✅ Google OAuth redirects properly
2. ✅ User can sign up with email/password  
3. ✅ User profiles created in both auth.users and public.users
4. ✅ Users can access protected routes (/dashboard, /profile)
5. ✅ User data displays correctly in UI
6. ✅ Sign out works properly
7. ✅ Account deletion works (if testing)

## 🔒 SECURITY CHECKLIST

After setup, verify:
- [ ] RLS policies prevent unauthorized access
- [ ] Users can only see/edit their own data  
- [ ] Service role key is properly secured
- [ ] OAuth credentials are not exposed in client-side code
- [ ] All routes requiring authentication are protected by middleware

---

**⚠️ IMPORTANT**: Complete this setup before testing authentication. The system will not work without proper OAuth configuration in the Supabase dashboard.