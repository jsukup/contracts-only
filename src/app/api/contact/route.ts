import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/sender'

interface ContactFormData {
  name: string
  email: string
  subject: string
  message: string
}

// Input validation
function validateContactForm(data: any): ContactFormData {
  const errors: string[] = []
  
  // Required fields
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Name is required')
  }
  
  if (!data.email || typeof data.email !== 'string' || data.email.trim().length === 0) {
    errors.push('Email is required')
  } else {
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email.trim())) {
      errors.push('Invalid email format')
    }
  }
  
  if (!data.subject || typeof data.subject !== 'string' || data.subject.trim().length === 0) {
    errors.push('Subject is required')
  }
  
  if (!data.message || typeof data.message !== 'string' || data.message.trim().length < 10) {
    errors.push('Message is required and must be at least 10 characters')
  }
  
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`)
  }
  
  // Sanitize and return cleaned data
  return {
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    subject: data.subject.trim(),
    message: data.message.trim()
  }
}

// Create HTML email template
function createEmailTemplate(data: ContactFormData): { html: string; text: string } {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Contact Form Submission - ContractsOnly</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 0; 
          background-color: #f9fafb;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
          background-color: white; 
          border-radius: 8px; 
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header { 
          text-align: center; 
          padding: 20px 0; 
          border-bottom: 1px solid #e5e7eb; 
          margin-bottom: 30px;
        }
        .header h1 { 
          color: #3b82f6; 
          margin: 10px 0 0 0; 
          font-size: 24px;
        }
        .content { 
          padding: 0 20px; 
        }
        .field { 
          margin-bottom: 20px; 
        }
        .field-label { 
          font-weight: 600; 
          color: #374151; 
          margin-bottom: 5px; 
          display: block;
        }
        .field-value { 
          background-color: #f9fafb; 
          padding: 10px 15px; 
          border-radius: 6px; 
          border: 1px solid #e5e7eb;
        }
        .message-field .field-value { 
          white-space: pre-wrap; 
          line-height: 1.6;
        }
        .footer { 
          text-align: center; 
          padding-top: 30px; 
          margin-top: 30px; 
          border-top: 1px solid #e5e7eb; 
          color: #6b7280; 
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ContractsOnly</h1>
          <p style="margin: 0; color: #6b7280;">Contact Form Submission</p>
        </div>
        
        <div class="content">
          <div class="field">
            <span class="field-label">From:</span>
            <div class="field-value">${data.name} &lt;${data.email}&gt;</div>
          </div>
          
          <div class="field">
            <span class="field-label">Subject:</span>
            <div class="field-value">${data.subject}</div>
          </div>
          
          <div class="field message-field">
            <span class="field-label">Message:</span>
            <div class="field-value">${data.message}</div>
          </div>
        </div>
        
        <div class="footer">
          <p>This message was sent via the ContractsOnly contact form.</p>
          <p>You can reply directly to this email to respond to ${data.name}.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Contact Form Submission - ContractsOnly

From: ${data.name} <${data.email}>
Subject: ${data.subject}

Message:
${data.message}

---
This message was sent via the ContractsOnly contact form.
You can reply directly to this email to respond to ${data.name}.
  `.trim()

  return { html, text }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let requestData
    try {
      requestData = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Validate form data
    let validatedData: ContactFormData
    try {
      validatedData = validateContactForm(requestData)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Validation failed' },
        { status: 400 }
      )
    }

    // Create email content
    const { html, text } = createEmailTemplate(validatedData)

    // Send email
    try {
      const emailResult = await sendEmail({
        to: 'info@contracts-only.com',
        subject: `[ContractsOnly Contact] ${validatedData.subject}`,
        html,
        text,
        replyTo: validatedData.email,
        from: 'ContractsOnly <info@contracts-only.com>'
      })

      console.log(`Contact form email sent successfully:`, {
        messageId: emailResult.messageId,
        provider: emailResult.provider,
        from: validatedData.email,
        subject: validatedData.subject
      })

      return NextResponse.json({
        success: true,
        message: 'Your message has been sent successfully',
        messageId: emailResult.messageId
      })

    } catch (emailError) {
      console.error('Failed to send contact form email:', emailError)
      
      return NextResponse.json(
        { 
          error: 'Failed to send email. Please try again later or contact us directly at info@contracts-only.com',
          details: process.env.NODE_ENV === 'development' ? String(emailError) : undefined
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Contact API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to submit contact form.' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to submit contact form.' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to submit contact form.' },
    { status: 405 }
  )
}