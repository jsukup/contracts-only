# Supabase Email Template Configuration Guide

## Overview
Supabase is currently using its default email templates. To add ContractsOnly branding and logos, you need to update the email templates in the Supabase Dashboard.

## Steps to Configure Email Templates

### 1. Access Email Templates
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **contracts-only**
3. Navigate to **Authentication** → **Email Templates** (in the left sidebar)

### 2. Update the "Confirm signup" Template

Replace the default template with this custom HTML:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <!-- Header with Logo -->
  <div style="text-align: center; padding: 40px 20px 20px; border-bottom: 1px solid #e5e7eb;">
    <img src="https://contracts-only.vercel.app/images/icons/android-chrome-192x192-light.png" alt="ContractsOnly" style="width: 80px; height: 80px;" />
    <h1 style="color: #3b82f6; margin: 15px 0 0 0; font-size: 28px; font-weight: bold;">ContractsOnly</h1>
    <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 16px;">Find Your Next Contract Job</p>
  </div>
  
  <!-- Main Content -->
  <div style="padding: 40px 20px;">
    <h2 style="color: #1f2937; margin-top: 0; font-size: 24px; font-weight: bold;">Verify Your Email Address</h2>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hello,</p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
      Welcome to ContractsOnly! Thank you for signing up with us. To complete your registration and start finding amazing contract opportunities, please verify your email address by clicking the button below.
    </p>
    
    <!-- CTA Button -->
    <div style="text-align: center; margin: 40px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.4);">
        Verify Email Address
      </a>
    </div>
    
    <!-- Features Preview -->
    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 30px 0;">
      <h3 style="color: #1f2937; margin-top: 0; font-size: 18px;">What you can do with ContractsOnly:</h3>
      <ul style="color: #374151; padding-left: 20px; line-height: 1.8;">
        <li>Browse thousands of contract job opportunities</li>
        <li>Create a professional profile to showcase your skills</li>
        <li>Connect with top employers looking for your expertise</li>
        <li>Get matched with jobs that fit your preferences</li>
      </ul>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
      If you didn't create an account with ContractsOnly, you can safely ignore this email.
    </p>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="{{ .ConfirmationURL }}" style="color: #3b82f6; word-break: break-all;">{{ .ConfirmationURL }}</a>
    </p>
  </div>
  
  <!-- Footer -->
  <div style="text-align: center; padding: 30px 20px; border-top: 1px solid #e5e7eb; background: #f9fafb;">
    <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
      Best regards,<br>The ContractsOnly Team
    </p>
    <div style="margin: 20px 0;">
      <a href="https://contracts-only.vercel.app" style="color: #3b82f6; text-decoration: none; font-weight: 500;">ContractsOnly.com</a>
      <span style="color: #d1d5db; margin: 0 8px;">|</span>
      <a href="https://contracts-only.vercel.app/jobs" style="color: #3b82f6; text-decoration: none; font-weight: 500;">Browse Jobs</a>
      <span style="color: #d1d5db; margin: 0 8px;">|</span>
      <a href="mailto:info@contracts-only.com" style="color: #3b82f6; text-decoration: none; font-weight: 500;">Support</a>
    </div>
    <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
      You're receiving this email because you signed up for ContractsOnly.<br>
      If you have any questions, contact us at <a href="mailto:info@contracts-only.com" style="color: #3b82f6;">info@contracts-only.com</a>
    </p>
  </div>
</div>
```

### 3. Update Email Subject
In the same "Confirm signup" template section:
- **Subject**: Change from "Confirm Your Signup" to "Verify your ContractsOnly account"

### 4. Important Variables
Make sure these Supabase template variables are preserved:
- `{{ .ConfirmationURL }}` - The verification link
- `{{ .Email }}` - User's email (optional)
- `{{ .Token }}` - Verification token (if needed)

### 5. Other Templates to Update (Optional)

#### Reset Password Template
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="text-align: center; padding: 40px 20px 20px; border-bottom: 1px solid #e5e7eb;">
    <img src="https://contracts-only.vercel.app/images/icons/android-chrome-192x192-light.png" alt="ContractsOnly" style="width: 80px; height: 80px;" />
    <h1 style="color: #3b82f6; margin: 15px 0 0 0; font-size: 28px; font-weight: bold;">ContractsOnly</h1>
  </div>
  <div style="padding: 40px 20px;">
    <h2 style="color: #1f2937; margin-top: 0; font-size: 24px; font-weight: bold;">Reset Your Password</h2>
    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
      Click the button below to reset your password. This link will expire in 1 hour.
    </p>
    <div style="text-align: center; margin: 40px 0;">
      <a href="{{ .ConfirmationURL }}" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
        Reset Password
      </a>
    </div>
  </div>
</div>
```

#### Magic Link Template
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="text-align: center; padding: 40px 20px 20px; border-bottom: 1px solid #e5e7eb;">
    <img src="https://contracts-only.vercel.app/images/icons/android-chrome-192x192-light.png" alt="ContractsOnly" style="width: 80px; height: 80px;" />
    <h1 style="color: #3b82f6; margin: 15px 0 0 0; font-size: 28px; font-weight: bold;">ContractsOnly</h1>
  </div>
  <div style="padding: 40px 20px;">
    <h2 style="color: #1f2937; margin-top: 0; font-size: 24px; font-weight: bold;">Sign In to ContractsOnly</h2>
    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
      Click the button below to sign in to your account. This link will expire in 1 hour.
    </p>
    <div style="text-align: center; margin: 40px 0;">
      <a href="{{ .ConfirmationURL }}" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
        Sign In
      </a>
    </div>
  </div>
</div>
```

### 6. Save Changes
After updating the templates:
1. Click **Save** at the bottom of the page
2. Test by creating a new account

## Troubleshooting Broken Logo Image

If the logo appears as a broken image, try these solutions:

### Option 1: Use a Data URL (Recommended)
Instead of using an external image URL, embed the logo as a base64 data URL. Replace the img tag with:

```html
<!-- Text-based logo (no external image required) -->
<div style="text-align: center; padding: 40px 20px 20px; border-bottom: 1px solid #e5e7eb;">
  <div style="width: 80px; height: 80px; margin: 0 auto; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center;">
    <span style="color: white; font-size: 36px; font-weight: bold;">C</span>
  </div>
  <h1 style="color: #3b82f6; margin: 15px 0 0 0; font-size: 28px; font-weight: bold;">ContractsOnly</h1>
  <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 16px;">Find Your Next Contract Job</p>
</div>
```

### Option 2: Use HTTPS CDN
Upload the logo to a CDN that's email-friendly:
- Upload to Imgur, Cloudinary, or similar service
- Use the direct image URL in the template

### Option 3: Text-Only Branding (Simplest)
Remove the img tag and use text-only branding:

```html
<div style="text-align: center; padding: 40px 20px 20px; border-bottom: 1px solid #e5e7eb;">
  <h1 style="color: #3b82f6; margin: 0; font-size: 32px; font-weight: bold;">ContractsOnly</h1>
  <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 16px;">Find Your Next Contract Job</p>
</div>
```

## Testing
1. Create a test account at https://contracts-only.vercel.app/auth/signup
2. Check that the email now includes:
   - ContractsOnly branding (logo or styled text)
   - Branded colors (blue theme)
   - Professional formatting
   - Correct subject line

## Notes
- External images may be blocked by email clients for security
- Supabase variables use `{{ .VariableName }}` syntax (double curly braces with dots)
- These templates override Supabase defaults but still use Supabase's email sending infrastructure
- Some email services (Gmail, Outlook) proxy images which can cause issues

## Alternative: Use Resend for All Emails
If you prefer to use Resend for all transactional emails (including verification):
1. Disable Supabase email templates
2. Use Supabase webhooks to trigger custom email sending
3. This requires more setup but gives complete control over email design and delivery

---

Last updated: 2025-08-25