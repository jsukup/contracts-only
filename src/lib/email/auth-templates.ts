import { sendEmail, EmailOptions } from './sender'

/**
 * Email verification template for new user registration
 */
export async function sendEmailVerification(
  email: string, 
  verificationUrl: string, 
  name?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const result = await sendEmail({
      to: email,
      subject: 'Verify your ContractsOnly account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header with Logo -->
          <div style="text-align: center; padding: 40px 20px 20px; border-bottom: 1px solid #e5e7eb;">
            <img src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/images/icons/android-chrome-192x192-light.png" alt="ContractsOnly" style="width: 80px; height: 80px;" />
            <h1 style="color: #3b82f6; margin: 15px 0 0 0; font-size: 28px; font-weight: bold;">ContractsOnly</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 16px;">Find Your Next Contract Job</p>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 24px; font-weight: bold;">Verify Your Email Address</h2>
            
            ${name ? `<p style="color: #374151; font-size: 16px; line-height: 1.6;">Hello ${name},</p>` : '<p style="color: #374151; font-size: 16px; line-height: 1.6;">Hello,</p>'}
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Welcome to ContractsOnly! Thank you for signing up with us. To complete your registration and start finding amazing contract opportunities, please verify your email address by clicking the button below.
            </p>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="${verificationUrl}" 
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
              <a href="${verificationUrl}" style="color: #3b82f6; word-break: break-all;">${verificationUrl}</a>
            </p>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; padding: 30px 20px; border-top: 1px solid #e5e7eb; background: #f9fafb;">
            <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
              Best regards,<br>The ContractsOnly Team
            </p>
            <div style="margin: 20px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">ContractsOnly.com</a>
              <span style="color: #d1d5db; margin: 0 8px;">|</span>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/jobs" style="color: #3b82f6; text-decoration: none; font-weight: 500;">Browse Jobs</a>
              <span style="color: #d1d5db; margin: 0 8px;">|</span>
              <a href="mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'info@contracts-only.com'}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">Support</a>
            </div>
            <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
              You're receiving this email because you signed up for ContractsOnly.<br>
              If you have any questions, contact us at <a href="mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'info@contracts-only.com'}" style="color: #3b82f6;">${process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'info@contracts-only.com'}</a>
            </p>
          </div>
        </div>
      `,
      text: `
Verify Your ContractsOnly Account

${name ? `Hello ${name},` : 'Hello,'}

Welcome to ContractsOnly! Thank you for signing up with us. To complete your registration and start finding amazing contract opportunities, please verify your email address.

Click this link to verify your account: ${verificationUrl}

What you can do with ContractsOnly:
• Browse thousands of contract job opportunities
• Create a professional profile to showcase your skills
• Connect with top employers looking for your expertise
• Get matched with jobs that fit your preferences

If you didn't create an account with ContractsOnly, you can safely ignore this email.

Best regards,
The ContractsOnly Team

ContractsOnly.com
Support: ${process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'info@contracts-only.com'}
      `
    })

    return {
      success: true,
      messageId: result.messageId
    }
  } catch (error) {
    console.error('Failed to send email verification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Welcome email template for verified users
 */
export async function sendWelcomeEmail(
  email: string,
  name: string,
  userRole: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const roleSpecificContent = userRole === 'RECRUITER' ? {
    title: 'Welcome to ContractsOnly - Start Hiring Top Talent',
    benefits: [
      'Post unlimited job opportunities',
      'Access our database of skilled contractors',
      'Manage applications with our intuitive dashboard',
      'Connect with pre-vetted professionals'
    ],
    cta: 'Post Your First Job',
    ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/jobs/post`
  } : {
    title: 'Welcome to ContractsOnly - Start Your Contract Journey',
    benefits: [
      'Browse thousands of contract opportunities',
      'Create a standout professional profile',
      'Get matched with jobs that fit your skills',
      'Connect directly with hiring managers'
    ],
    cta: 'Explore Job Opportunities',
    ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/jobs`
  }

  try {
    const result = await sendEmail({
      to: email,
      subject: `${roleSpecificContent.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header with Logo -->
          <div style="text-align: center; padding: 40px 20px 20px; border-bottom: 1px solid #e5e7eb;">
            <img src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/images/icons/android-chrome-192x192-light.png" alt="ContractsOnly" style="width: 80px; height: 80px;" />
            <h1 style="color: #3b82f6; margin: 15px 0 0 0; font-size: 28px; font-weight: bold;">ContractsOnly</h1>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 20px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 24px; font-weight: bold;">${roleSpecificContent.title}</h2>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hello ${name},</p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              🎉 <strong>Congratulations!</strong> Your email has been verified and your ContractsOnly account is now active. You're all set to start your journey in the contract work marketplace.
            </p>
            
            <!-- Benefits -->
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #3b82f6;">
              <h3 style="color: #1f2937; margin-top: 0; font-size: 18px;">Here's what you can do now:</h3>
              <ul style="color: #374151; padding-left: 20px; line-height: 1.8; margin: 0;">
                ${roleSpecificContent.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
              </ul>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="${roleSpecificContent.ctaUrl}" 
                 style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(5, 150, 105, 0.4);">
                ${roleSpecificContent.cta}
              </a>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Need help getting started? Our support team is here to help you make the most of ContractsOnly.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; padding: 30px 20px; border-top: 1px solid #e5e7eb; background: #f9fafb;">
            <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
              Welcome to the team!<br>The ContractsOnly Team
            </p>
            <div style="margin: 20px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" style="color: #3b82f6; text-decoration: none; font-weight: 500;">Dashboard</a>
              <span style="color: #d1d5db; margin: 0 8px;">|</span>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/profile" style="color: #3b82f6; text-decoration: none; font-weight: 500;">Profile</a>
              <span style="color: #d1d5db; margin: 0 8px;">|</span>
              <a href="mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'info@contracts-only.com'}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">Support</a>
            </div>
          </div>
        </div>
      `,
      text: `
${roleSpecificContent.title}

Hello ${name},

🎉 Congratulations! Your email has been verified and your ContractsOnly account is now active.

Here's what you can do now:
${roleSpecificContent.benefits.map(benefit => `• ${benefit}`).join('\n')}

Get started: ${roleSpecificContent.ctaUrl}

Need help? Contact us at ${process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'info@contracts-only.com'}

Welcome to the team!
The ContractsOnly Team

Dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard
      `
    })

    return {
      success: true,
      messageId: result.messageId
    }
  } catch (error) {
    console.error('Failed to send welcome email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}