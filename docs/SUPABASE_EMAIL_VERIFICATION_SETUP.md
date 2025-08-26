# SUPABASE EMAIL VERIFICATION SETUP

## 🔧 STEP 1: Enable Email Confirmations in Supabase Dashboard

### Navigate to Authentication Settings
1. Go to https://supabase.com/dashboard
2. Select your project: **contracts-only** (ID: jrdwwhwckbkplnnalhox)
3. Go to **Authentication** → **Settings**

### Email Configuration
1. **Enable email confirmations**
   - Toggle **Enable email confirmations** to ON
   - This requires users to verify their email before they can sign in

2. **Configure Site URL**
   - Set **Site URL** to: `http://localhost:3000` (for development)
   - For production, use: `https://your-production-domain.com`

3. **Set Redirect URLs**
   - Add redirect URL: `http://localhost:3000/auth/verify-email`
   - For production: `https://your-domain.com/auth/verify-email`

## 🔧 STEP 2: Configure Email Templates

### Navigate to Email Templates
1. In Supabase Dashboard, go to **Authentication** → **Email Templates**
2. Select **Confirm signup** template

### Customize Email Verification Template
Replace the default template with ContractsOnly branding:

**Subject:** `Verify your ContractsOnly account`

**Email Content (HTML):**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #e5e7eb;">
    <img src="https://your-domain.com/images/icons/android-chrome-192x192-light.png" alt="ContractsOnly" style="width: 64px; height: 64px;" />
    <h1 style="color: #3b82f6; margin: 10px 0 0 0; font-size: 24px;">ContractsOnly</h1>
  </div>
  
  <div style="padding: 30px 20px;">
    <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
    
    <p>Hello,</p>
    
    <p>Thank you for signing up with ContractsOnly! To complete your registration and start finding amazing contract opportunities, please verify your email address.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
        Verify Email Address
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px;">
      If you didn't create an account with ContractsOnly, you can safely ignore this email.
    </p>
    
    <p style="color: #666; font-size: 14px;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="{{ .ConfirmationURL }}" style="color: #3b82f6;">{{ .ConfirmationURL }}</a>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; border-top: 1px solid #e5e7eb; color: #666; font-size: 14px;">
    <p>Best regards,<br>The ContractsOnly Team</p>
    <p>
      <a href="http://localhost:3000" style="color: #3b82f6;">ContractsOnly.com</a> | 
      <a href="http://localhost:3000/jobs" style="color: #3b82f6;">Browse Jobs</a>
    </p>
  </div>
</div>
```

## 🔧 STEP 3: Configure SMTP Settings (Optional - Use Resend)

For production, configure custom SMTP to use your Resend service:

### In Supabase Dashboard → Authentication → Settings:
1. **Enable custom SMTP**
2. Configure with Resend SMTP settings:
   - **Host:** smtp.resend.com
   - **Port:** 587
   - **Username:** resend
   - **Password:** Your Resend API key (re_5LpA5rvz_swuUxrfAccoqwEnwekJgpio3)
   - **Sender email:** info@contracts-only.com
   - **Sender name:** ContractsOnly

> **Note:** This requires domain verification in Resend first

## 🔧 STEP 4: Update Environment Variables

Ensure your `.env` file has the correct configuration:

```env
# Supabase Authentication
NEXT_PUBLIC_SUPABASE_URL="https://jrdwwhwckbkplnnalhox.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# For production, ensure Site URL matches your domain
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Resend (for custom email templates)
RESEND_API_KEY=re_5LpA5rvz_swuUxrfAccoqwEnwekJgpio3
```

## 🔧 STEP 5: Authentication Flow Summary

After configuration:

1. **User signs up** → Receives verification email from ContractsOnly
2. **User clicks email link** → Redirects to `/auth/verify-email` success page
3. **User is automatically signed in** → Redirected to `/dashboard`
4. **Unverified users cannot sign in** → Shown verification reminder

## ✅ Verification Steps

1. ✅ Enable email confirmations in Supabase Dashboard
2. ✅ Set Site URL and redirect URLs
3. ✅ Configure email template with ContractsOnly branding
4. ✅ (Optional) Set up custom SMTP with Resend
5. ✅ Test signup flow with email verification

## 🚨 Important Notes

- Email confirmations are required for new signups
- Users with unverified emails cannot sign in
- The verification link expires after 24 hours
- For production, verify your domain in Resend before using custom SMTP