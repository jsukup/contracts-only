/**
 * Email Optimization System
 * Handles template optimization, spam score checking, and deliverability improvements
 */

import { JSDOM } from 'jsdom'
import juice from 'juice'

export interface EmailOptimizationResult {
  html: string
  text: string
  warnings: string[]
  score: number
  recommendations: string[]
}

export interface EmailMetrics {
  imageToTextRatio: number
  linkCount: number
  wordCount: number
  subjectLength: number
  hasUnsubscribeLink: boolean
  hasPhysicalAddress: boolean
  spamKeywords: number
}

export class EmailOptimizer {
  /**
   * Optimize email HTML for better deliverability
   */
  static optimizeHtml(html: string): string {
    try {
      // Inline CSS for better email client compatibility
      let optimizedHtml = juice(html)
      
      // Add email-specific meta tags
      const dom = new JSDOM(optimizedHtml)
      const document = dom.window.document
      const head = document.querySelector('head')
      
      if (head) {
        // Add viewport meta for mobile
        const viewport = document.createElement('meta')
        viewport.setAttribute('name', 'viewport')
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0')
        head.appendChild(viewport)
        
        // Add format detection prevention
        const formatDetection = document.createElement('meta')
        formatDetection.setAttribute('name', 'format-detection')
        formatDetection.setAttribute('content', 'telephone=no, date=no, address=no, email=no')
        head.appendChild(formatDetection)
        
        // Add x-apple-disable-message-reformatting
        const appleReformatting = document.createElement('meta')
        appleReformatting.setAttribute('name', 'x-apple-disable-message-reformatting')
        head.appendChild(appleReformatting)
      }
      
      // Add table-based layout wrapper for Outlook compatibility
      const body = document.querySelector('body')
      if (body && !body.querySelector('.email-wrapper-table')) {
        const content = body.innerHTML
        body.innerHTML = `
          <!--[if mso | IE]>
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="width:600px;">
          <tr>
          <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">
          <![endif]-->
          <div class="email-wrapper-table" style="max-width:600px;margin:0 auto;">
            ${content}
          </div>
          <!--[if mso | IE]>
          </td>
          </tr>
          </table>
          <![endif]-->
        `
      }
      
      // Add preheader text for better inbox previews
      if (body && !body.querySelector('.preheader')) {
        const preheader = document.createElement('div')
        preheader.className = 'preheader'
        preheader.style.cssText = 'display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;'
        preheader.textContent = this.generatePreheaderText(body.textContent || '')
        body.insertBefore(preheader, body.firstChild)
      }
      
      return dom.serialize()
      
    } catch (error) {
      console.error('Error optimizing HTML:', error)
      return html // Return original if optimization fails
    }
  }
  
  /**
   * Generate optimized preview text
   */
  static generatePreheaderText(bodyText: string): string {
    // Extract first meaningful sentence
    const cleanText = bodyText
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 150)
    
    // Remove common greetings to get to the meat
    const withoutGreeting = cleanText
      .replace(/^(Hi|Hello|Dear|Greetings)[^,]*,\s*/i, '')
      .replace(/^(Welcome|Thanks|Thank you)[^.!]*[.!]\s*/i, '')
    
    // Add trailing dots if truncated
    return withoutGreeting.length < cleanText.length 
      ? withoutGreeting + '...' 
      : withoutGreeting
  }
  
  /**
   * Analyze email for spam indicators
   */
  static analyzeSpamScore(html: string, subject: string): EmailMetrics {
    const dom = new JSDOM(html)
    const document = dom.window.document
    const text = document.body?.textContent || ''
    
    // Common spam keywords to check
    const spamKeywords = [
      'free', 'guarantee', 'no obligation', 'risk-free', 'urgent',
      'act now', 'limited time', 'click here', 'buy now', 'special offer',
      'congratulations', 'winner', 'prize', 'cash', 'money back',
      '100%', 'amazing', 'certified', 'guaranteed', 'increase sales'
    ]
    
    const lowerText = text.toLowerCase()
    const lowerSubject = subject.toLowerCase()
    const combinedText = lowerText + ' ' + lowerSubject
    
    // Count spam keywords
    const spamKeywordCount = spamKeywords.filter(keyword => 
      combinedText.includes(keyword)
    ).length
    
    // Count images
    const images = document.querySelectorAll('img').length
    
    // Count links
    const links = document.querySelectorAll('a').length
    
    // Count words
    const words = text.split(/\s+/).filter(word => word.length > 0).length
    
    // Check for unsubscribe link
    const hasUnsubscribe = combinedText.includes('unsubscribe') || 
                          combinedText.includes('opt-out') ||
                          combinedText.includes('preferences')
    
    // Check for physical address (CAN-SPAM requirement)
    const hasAddress = /\d+\s+\w+\s+(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|place|pl)/i.test(text) ||
                      combinedText.includes('po box') ||
                      combinedText.includes('p.o. box')
    
    return {
      imageToTextRatio: words > 0 ? images / words : images,
      linkCount: links,
      wordCount: words,
      subjectLength: subject.length,
      hasUnsubscribeLink: hasUnsubscribe,
      hasPhysicalAddress: hasAddress,
      spamKeywords: spamKeywordCount
    }
  }
  
  /**
   * Calculate deliverability score
   */
  static calculateDeliverabilityScore(metrics: EmailMetrics): number {
    let score = 100
    
    // Penalize high image to text ratio
    if (metrics.imageToTextRatio > 0.4) score -= 15
    if (metrics.imageToTextRatio > 0.6) score -= 25
    
    // Penalize too many links
    if (metrics.linkCount > 20) score -= 10
    if (metrics.linkCount > 30) score -= 20
    
    // Penalize too short or too long content
    if (metrics.wordCount < 50) score -= 15
    if (metrics.wordCount > 2000) score -= 10
    
    // Penalize long subjects
    if (metrics.subjectLength > 70) score -= 10
    if (metrics.subjectLength > 100) score -= 20
    
    // Reward compliance features
    if (metrics.hasUnsubscribeLink) score += 10
    if (metrics.hasPhysicalAddress) score += 10
    
    // Penalize spam keywords
    score -= metrics.spamKeywords * 5
    
    return Math.max(0, Math.min(100, score))
  }
  
  /**
   * Generate optimization recommendations
   */
  static generateRecommendations(metrics: EmailMetrics, score: number): string[] {
    const recommendations: string[] = []
    
    if (score < 70) {
      recommendations.push('⚠️ Low deliverability score - review recommendations below')
    }
    
    if (metrics.imageToTextRatio > 0.4) {
      recommendations.push('📷 Reduce image count or add more text content')
    }
    
    if (metrics.linkCount > 20) {
      recommendations.push('🔗 Too many links - consider reducing to under 20')
    }
    
    if (metrics.wordCount < 50) {
      recommendations.push('📝 Add more text content (minimum 50 words recommended)')
    }
    
    if (metrics.wordCount > 2000) {
      recommendations.push('📚 Content is very long - consider breaking into multiple emails')
    }
    
    if (metrics.subjectLength > 70) {
      recommendations.push('✉️ Subject line is too long - keep under 70 characters')
    }
    
    if (!metrics.hasUnsubscribeLink) {
      recommendations.push('🚫 Add an unsubscribe link for CAN-SPAM compliance')
    }
    
    if (!metrics.hasPhysicalAddress) {
      recommendations.push('📍 Add a physical mailing address for CAN-SPAM compliance')
    }
    
    if (metrics.spamKeywords > 3) {
      recommendations.push('⚡ Reduce use of spam trigger words')
    }
    
    if (recommendations.length === 0 && score >= 90) {
      recommendations.push('✅ Email is well-optimized for deliverability!')
    }
    
    return recommendations
  }
  
  /**
   * Generate mobile-responsive CSS
   */
  static getMobileResponsiveStyles(): string {
    return `
      <style>
        /* Base styles */
        body {
          margin: 0;
          padding: 0;
          width: 100% !important;
          min-width: 100%;
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }
        
        table {
          border-collapse: collapse;
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
        }
        
        img {
          border: 0;
          height: auto;
          line-height: 100%;
          outline: none;
          text-decoration: none;
          -ms-interpolation-mode: bicubic;
          max-width: 100%;
        }
        
        /* Mobile styles */
        @media screen and (max-width: 600px) {
          .mobile-hide {
            display: none !important;
          }
          
          .mobile-center {
            text-align: center !important;
          }
          
          .mobile-full-width {
            width: 100% !important;
            max-width: 100% !important;
          }
          
          .mobile-padding {
            padding: 20px !important;
          }
          
          .mobile-button {
            width: 100% !important;
            max-width: 300px !important;
            margin: 10px auto !important;
          }
          
          h1 {
            font-size: 24px !important;
            line-height: 32px !important;
          }
          
          h2 {
            font-size: 20px !important;
            line-height: 28px !important;
          }
          
          p, td {
            font-size: 16px !important;
            line-height: 24px !important;
          }
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .dark-mode-bg {
            background-color: #1a1a1a !important;
          }
          
          .dark-mode-text {
            color: #ffffff !important;
          }
          
          .dark-mode-link {
            color: #4a9eff !important;
          }
        }
      </style>
    `
  }
  
  /**
   * Complete email optimization pipeline
   */
  static async optimizeEmail(
    html: string, 
    subject: string,
    includeStyles: boolean = true
  ): Promise<EmailOptimizationResult> {
    const warnings: string[] = []
    
    try {
      // Add responsive styles if requested
      let optimizedHtml = html
      if (includeStyles && !html.includes('@media')) {
        const styleTag = this.getMobileResponsiveStyles()
        optimizedHtml = optimizedHtml.replace('</head>', `${styleTag}</head>`)
      }
      
      // Optimize HTML structure
      optimizedHtml = this.optimizeHtml(optimizedHtml)
      
      // Analyze for spam indicators
      const metrics = this.analyzeSpamScore(optimizedHtml, subject)
      
      // Calculate deliverability score
      const score = this.calculateDeliverabilityScore(metrics)
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(metrics, score)
      
      // Generate plain text version
      const plainText = this.generatePlainText(optimizedHtml)
      
      // Add warnings for critical issues
      if (score < 50) {
        warnings.push('Critical: Very low deliverability score')
      }
      
      if (!metrics.hasUnsubscribeLink) {
        warnings.push('Missing unsubscribe link (CAN-SPAM violation)')
      }
      
      if (!metrics.hasPhysicalAddress) {
        warnings.push('Missing physical address (CAN-SPAM violation)')
      }
      
      return {
        html: optimizedHtml,
        text: plainText,
        warnings,
        score,
        recommendations
      }
      
    } catch (error) {
      console.error('Email optimization error:', error)
      return {
        html,
        text: this.generatePlainText(html),
        warnings: ['Optimization failed: ' + (error instanceof Error ? error.message : 'Unknown error')],
        score: 0,
        recommendations: ['Fix optimization errors before sending']
      }
    }
  }
  
  /**
   * Generate plain text version from HTML
   */
  static generatePlainText(html: string): string {
    const dom = new JSDOM(html)
    const document = dom.window.document
    
    // Remove script and style elements
    const scripts = document.querySelectorAll('script, style')
    scripts.forEach(el => el.remove())
    
    // Get text content
    let text = document.body?.textContent || ''
    
    // Clean up whitespace
    text = text
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple line breaks to double
      .replace(/[ \t]+/g, ' ') // Multiple spaces to single
      .trim()
    
    // Add link URLs in parentheses
    const links = document.querySelectorAll('a[href]')
    links.forEach(link => {
      const href = link.getAttribute('href')
      const linkText = link.textContent
      if (href && linkText && !href.startsWith('#')) {
        text = text.replace(linkText, `${linkText} (${href})`)
      }
    })
    
    return text
  }
  
  /**
   * Validate email addresses
   */
  static validateEmailAddress(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
  
  /**
   * Check if email domain is blacklisted
   */
  static async isDomainBlacklisted(email: string): Promise<boolean> {
    // Common disposable email domains
    const blacklistedDomains = [
      'tempmail.com', 'throwaway.email', '10minutemail.com',
      'guerrillamail.com', 'mailinator.com', 'maildrop.cc'
    ]
    
    const domain = email.split('@')[1]?.toLowerCase()
    return blacklistedDomains.includes(domain)
  }
}