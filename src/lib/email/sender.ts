// Email sending utility - abstracted to support multiple providers

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text: string
  from?: string
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

export interface EmailProvider {
  name: string
  send(options: EmailOptions): Promise<{ messageId: string }>
}

// Resend provider implementation
class ResendProvider implements EmailProvider {
  name = 'resend'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async send(options: EmailOptions): Promise<{ messageId: string }> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: options.from || 'ContractsOnly <noreply@contractsonly.com>',
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Resend API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    return { messageId: result.id }
  }
}

// SendGrid provider implementation  
class SendGridProvider implements EmailProvider {
  name = 'sendgrid'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async send(options: EmailOptions): Promise<{ messageId: string }> {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: options.to }],
            subject: options.subject
          }
        ],
        from: {
          email: options.from?.match(/<(.+)>/)?.[1] || 'noreply@contractsonly.com',
          name: options.from?.match(/^([^<]+)</)?.[1]?.trim() || 'ContractsOnly'
        },
        content: [
          {
            type: 'text/plain',
            value: options.text
          },
          {
            type: 'text/html',
            value: options.html
          }
        ],
        reply_to: options.replyTo ? { email: options.replyTo } : undefined
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`SendGrid API error: ${response.status} - ${errorText}`)
    }

    // SendGrid returns 202 with no body on success
    return { messageId: `sendgrid_${Date.now()}` }
  }
}

// Console provider for development/testing
class ConsoleProvider implements EmailProvider {
  name = 'console'

  async send(options: EmailOptions): Promise<{ messageId: string }> {
    console.log('📧 Email would be sent:')
    console.log(`To: ${options.to}`)
    console.log(`Subject: ${options.subject}`)
    console.log(`Text content: ${options.text.substring(0, 200)}...`)
    console.log('---')
    
    return { messageId: `console_${Date.now()}` }
  }
}

// Email service factory
class EmailService {
  private provider: EmailProvider
  private fallbackProvider?: EmailProvider

  constructor() {
    this.provider = this.createProvider()
    this.fallbackProvider = this.createFallbackProvider()
  }

  private createProvider(): EmailProvider {
    const resendKey = process.env.RESEND_API_KEY
    const sendGridKey = process.env.SENDGRID_API_KEY

    if (resendKey) {
      return new ResendProvider(resendKey)
    }
    
    if (sendGridKey) {
      return new SendGridProvider(sendGridKey)
    }

    // Fallback to console in development
    if (process.env.NODE_ENV === 'development') {
      return new ConsoleProvider()
    }

    throw new Error('No email provider configured. Set RESEND_API_KEY or SENDGRID_API_KEY')
  }

  private createFallbackProvider(): EmailProvider | undefined {
    const resendKey = process.env.RESEND_API_KEY
    const sendGridKey = process.env.SENDGRID_API_KEY

    // If primary is Resend, fallback to SendGrid
    if (this.provider.name === 'resend' && sendGridKey) {
      return new SendGridProvider(sendGridKey)
    }

    // If primary is SendGrid, fallback to Resend
    if (this.provider.name === 'sendgrid' && resendKey) {
      return new ResendProvider(resendKey)
    }

    return undefined
  }

  async send(options: EmailOptions): Promise<{ messageId: string; provider: string }> {
    try {
      const result = await this.provider.send(options)
      return { ...result, provider: this.provider.name }
    } catch (error) {
      console.error(`Primary email provider (${this.provider.name}) failed:`, error)

      // Try fallback provider if available
      if (this.fallbackProvider) {
        try {
          console.log(`Attempting fallback provider: ${this.fallbackProvider.name}`)
          const result = await this.fallbackProvider.send(options)
          return { ...result, provider: `${this.fallbackProvider.name}_fallback` }
        } catch (fallbackError) {
          console.error(`Fallback email provider failed:`, fallbackError)
          throw new Error(`Both email providers failed. Primary: ${error}. Fallback: ${fallbackError}`)
        }
      }

      throw error
    }
  }

  getProviderInfo() {
    return {
      primary: this.provider.name,
      fallback: this.fallbackProvider?.name || null
    }
  }
}

// Singleton instance
const emailService = new EmailService()

/**
 * Send email using configured provider with fallback support
 */
export async function sendEmail(options: EmailOptions): Promise<{ messageId: string; provider: string }> {
  // Validate required fields
  if (!options.to || !options.subject || (!options.html && !options.text)) {
    throw new Error('Email missing required fields: to, subject, and content')
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(options.to)) {
    throw new Error(`Invalid email address: ${options.to}`)
  }

  // Send email
  return await emailService.send(options)
}

/**
 * Get email service configuration info
 */
export function getEmailProviderInfo() {
  return emailService.getProviderInfo()
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(testEmail: string): Promise<{
  success: boolean
  provider: string
  messageId?: string
  error?: string
}> {
  try {
    const result = await sendEmail({
      to: testEmail,
      subject: 'ContractsOnly Email Test',
      html: `
        <h2>Email Configuration Test</h2>
        <p>This is a test email to verify your ContractsOnly email configuration is working correctly.</p>
        <p>If you received this email, your email service is configured properly.</p>
        <p>Provider used: <strong>${emailService.getProviderInfo().primary}</strong></p>
        <hr>
        <small>This is an automated test email from ContractsOnly</small>
      `,
      text: `
Email Configuration Test

This is a test email to verify your ContractsOnly email configuration is working correctly.

If you received this email, your email service is configured properly.

Provider used: ${emailService.getProviderInfo().primary}

This is an automated test email from ContractsOnly
      `
    })

    return {
      success: true,
      provider: result.provider,
      messageId: result.messageId
    }
  } catch (error) {
    return {
      success: false,
      provider: emailService.getProviderInfo().primary,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}