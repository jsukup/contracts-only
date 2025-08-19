// Email service abstraction layer
// This can be easily swapped between different providers (SendGrid, Resend, Nodemailer, etc.)

export interface EmailTemplate {
  to: string
  subject: string
  html: string
  text?: string
}

export interface ApplicationNotificationData {
  applicantName: string
  jobTitle: string
  company: string
  jobId: string
  applicationId: string
}

export interface JobPostedNotificationData {
  employerName: string
  jobTitle: string
  company: string
  jobId: string
}

export class EmailService {
  private static instance: EmailService
  
  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  // Mock email sending for development
  // In production, this would integrate with actual email service
  async send(template: EmailTemplate): Promise<boolean> {
    console.log('📧 Email would be sent:', {
      to: template.to,
      subject: template.subject,
      preview: template.html.substring(0, 100) + '...'
    })
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // In production, replace with actual email service:
    // - SendGrid: await sgMail.send(template)
    // - Resend: await resend.emails.send(template)
    // - AWS SES: await ses.sendEmail(template)
    
    return true
  }

  // Application submitted notification to employer
  async sendApplicationNotification(
    employerEmail: string,
    data: ApplicationNotificationData
  ): Promise<boolean> {
    const template: EmailTemplate = {
      to: employerEmail,
      subject: `New Application: ${data.jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Job Application Received</h2>
          
          <p>Hello,</p>
          
          <p>You have received a new application for your job posting:</p>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0; color: #2563eb;">${data.jobTitle}</h3>
            <p style="margin: 5px 0; color: #666;">${data.company}</p>
            <p style="margin: 10px 0;"><strong>Applicant:</strong> ${data.applicantName}</p>
          </div>
          
          <p>
            <a href="http://localhost:3000/employer/jobs/${data.jobId}/applications" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Review Application
            </a>
          </p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            You're receiving this email because you posted a job on ContractsOnly. 
            <br>
            <a href="http://localhost:3000/employer/dashboard">Manage your job postings</a>
          </p>
        </div>
      `,
      text: `New job application received for ${data.jobTitle} from ${data.applicantName}. View at: http://localhost:3000/employer/jobs/${data.jobId}/applications`
    }

    return this.send(template)
  }

  // Application confirmation to applicant
  async sendApplicationConfirmation(
    applicantEmail: string,
    data: ApplicationNotificationData
  ): Promise<boolean> {
    const template: EmailTemplate = {
      to: applicantEmail,
      subject: `Application Confirmed: ${data.jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Application Submitted Successfully</h2>
          
          <p>Hello ${data.applicantName},</p>
          
          <p>Your application has been successfully submitted for:</p>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <h3 style="margin: 0; color: #2563eb;">${data.jobTitle}</h3>
            <p style="margin: 5px 0; color: #666;">${data.company}</p>
          </div>
          
          <p>The employer has been notified of your application and will review it soon. You'll receive an email notification if there are any updates.</p>
          
          <p>
            <a href="http://localhost:3000/applications/${data.applicationId}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Application Status
            </a>
          </p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Good luck with your application!
            <br>
            <a href="http://localhost:3000/dashboard">View your dashboard</a> | 
            <a href="http://localhost:3000/jobs">Browse more jobs</a>
          </p>
        </div>
      `,
      text: `Your application for ${data.jobTitle} at ${data.company} has been submitted successfully. View status at: http://localhost:3000/applications/${data.applicationId}`
    }

    return this.send(template)
  }

  // Job posted notification (could be sent to matching contractors)
  async sendJobPostedNotification(
    contractorEmail: string,
    data: JobPostedNotificationData
  ): Promise<boolean> {
    const template: EmailTemplate = {
      to: contractorEmail,
      subject: `New Job Match: ${data.jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Job Opportunity</h2>
          
          <p>Hello,</p>
          
          <p>A new job has been posted that matches your profile:</p>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
            <h3 style="margin: 0; color: #22c55e;">${data.jobTitle}</h3>
            <p style="margin: 5px 0; color: #666;">${data.company}</p>
            <p style="margin: 10px 0;"><strong>Posted by:</strong> ${data.employerName}</p>
          </div>
          
          <p>Don't miss this opportunity to showcase your skills!</p>
          
          <p>
            <a href="http://localhost:3000/jobs/${data.jobId}" 
               style="background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Job Details
            </a>
          </p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            You're receiving this because your skills match this job posting.
            <br>
            <a href="http://localhost:3000/profile/settings">Update your preferences</a>
          </p>
        </div>
      `,
      text: `New job opportunity: ${data.jobTitle} at ${data.company}. View details at: http://localhost:3000/jobs/${data.jobId}`
    }

    return this.send(template)
  }

  // Application status update notification
  async sendApplicationStatusUpdate(
    applicantEmail: string,
    applicantName: string,
    jobTitle: string,
    company: string,
    status: 'accepted' | 'rejected',
    applicationId: string
  ): Promise<boolean> {
    const isAccepted = status === 'accepted'
    const template: EmailTemplate = {
      to: applicantEmail,
      subject: `Application Update: ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Application Status Update</h2>
          
          <p>Hello ${applicantName},</p>
          
          <p>We have an update on your application for:</p>
          
          <div style="background: ${isAccepted ? '#f0fdf4' : '#fef2f2'}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${isAccepted ? '#22c55e' : '#ef4444'};">
            <h3 style="margin: 0; color: ${isAccepted ? '#22c55e' : '#ef4444'};">${jobTitle}</h3>
            <p style="margin: 5px 0; color: #666;">${company}</p>
            <p style="margin: 15px 0; font-weight: bold; color: ${isAccepted ? '#22c55e' : '#ef4444'};">
              Status: ${isAccepted ? 'Congratulations! Your application has been accepted.' : 'Thank you for your interest. Unfortunately, we have decided to move forward with other candidates.'}
            </p>
          </div>
          
          ${isAccepted 
            ? `<p>The employer will contact you directly to discuss next steps. Please check your application for any contact information.</p>`
            : `<p>We encourage you to continue applying to other opportunities on our platform.</p>`
          }
          
          <p>
            <a href="http://localhost:3000/applications/${applicationId}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Application Details
            </a>
          </p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            <a href="http://localhost:3000/jobs">Browse more opportunities</a> | 
            <a href="http://localhost:3000/dashboard">Your dashboard</a>
          </p>
        </div>
      `,
      text: `Your application for ${jobTitle} at ${company} has been ${status}. View details at: http://localhost:3000/applications/${applicationId}`
    }

    return this.send(template)
  }
}