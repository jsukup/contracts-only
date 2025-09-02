// Google Analytics configuration for ContractsOnly
// Focused on recruiter value metrics and job application tracking

interface GtagEvent {
  event_category?: string
  event_label?: string
  value?: number
  [key: string]: unknown
}

declare global {
  interface Window {
    gtag: (command: string, targetId?: string, config?: GtagEvent) => void
    dataLayer: unknown[]
  }
}

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID

// Initialize Google Analytics
export function initGA() {
  if (!GA_TRACKING_ID) return

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args)
  }
  
  window.gtag('js', new Date())
  window.gtag('config', GA_TRACKING_ID, {
    page_title: document.title,
    page_location: window.location.href,
    send_page_view: true,
    // Enhanced ecommerce for job application tracking
    custom_map: {
      'custom_parameter_1': 'job_id',
      'custom_parameter_2': 'job_title', 
      'custom_parameter_3': 'job_company',
      'custom_parameter_4': 'job_rate'
    }
  })
}

// Track page views
export function trackPageView(url: string) {
  if (!GA_TRACKING_ID) return

  window.gtag('config', GA_TRACKING_ID, {
    page_location: url,
  })
}

// Track custom events - focused on recruiter KPIs
export function trackEvent(action: string, category: string, label?: string, value?: number, customParameters?: Record<string, unknown>) {
  if (!GA_TRACKING_ID) return

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
    ...customParameters
  })
}

// Recruiter-specific event tracking functions

// Track job application clicks (primary recruiter KPI)
export function trackJobApplication(jobData: {
  jobId: string
  jobTitle: string
  jobCompany: string
  jobRate?: string
  source: string
}) {
  trackEvent('job_application', 'Conversions', `${jobData.jobTitle} at ${jobData.jobCompany}`, 1, {
    job_id: jobData.jobId,
    job_title: jobData.jobTitle,
    job_company: jobData.jobCompany,
    job_rate: jobData.jobRate,
    application_source: jobData.source,
    currency: 'USD'
  })

  // Also track as conversion event for Google Ads
  window.gtag('event', 'conversion', {
    send_to: GA_TRACKING_ID,
    event_category: 'Job Applications',
    event_label: jobData.jobTitle,
    value: 1
  })
}

// Track job views (part of conversion funnel)
export function trackJobView(jobData: {
  jobId: string
  jobTitle: string
  jobCompany: string
  source: string
}) {
  trackEvent('job_view', 'Engagement', `${jobData.jobTitle} at ${jobData.jobCompany}`, 1, {
    job_id: jobData.jobId,
    job_title: jobData.jobTitle,
    job_company: jobData.jobCompany,
    view_source: jobData.source
  })
}

// Track job searches (contractor engagement)
export function trackJobSearch(searchData: {
  query?: string
  filters?: Record<string, any>
  resultsCount: number
}) {
  trackEvent('job_search', 'Search', searchData.query || 'empty_query', searchData.resultsCount, {
    search_query: searchData.query,
    search_filters: JSON.stringify(searchData.filters),
    results_count: searchData.resultsCount
  })
}

// Track user registration (platform growth)
export function trackUserRegistration(userData: {
  userType: 'contractor' | 'employer'
  registrationMethod: string
}) {
  trackEvent('user_registration', 'Conversions', userData.userType, 1, {
    user_type: userData.userType,
    registration_method: userData.registrationMethod
  })
}

// Track profile completion (contractor quality metric)
export function trackProfileCompletion(profileData: {
  userType: 'contractor' | 'employer'
  completionPercentage: number
  skillsAdded: number
}) {
  trackEvent('profile_completion', 'Engagement', `${profileData.userType}_profile`, profileData.completionPercentage, {
    user_type: profileData.userType,
    completion_percentage: profileData.completionPercentage,
    skills_count: profileData.skillsAdded
  })
}

// Track employer job posting (supply side growth)
export function trackJobPosting(jobData: {
  jobId: string
  jobTitle: string
  jobCompany: string
  jobType: string
  hourlyRate?: number
}) {
  trackEvent('job_posting', 'Conversions', `${jobData.jobTitle} by ${jobData.jobCompany}`, 1, {
    job_id: jobData.jobId,
    job_title: jobData.jobTitle,
    job_company: jobData.jobCompany,
    job_type: jobData.jobType,
    hourly_rate: jobData.hourlyRate
  })
}

// Track session engagement metrics
export function trackEngagement(engagementData: {
  sessionDuration: number
  pagesViewed: number
  applicationsStarted: number
  searchesPerformed: number
}) {
  trackEvent('session_engagement', 'Engagement', 'session_complete', engagementData.sessionDuration, {
    session_duration: engagementData.sessionDuration,
    pages_viewed: engagementData.pagesViewed,
    applications_started: engagementData.applicationsStarted,
    searches_performed: engagementData.searchesPerformed
  })
}

// Custom dimensions for advanced reporting
export function setCustomDimensions(dimensions: {
  userType?: 'contractor' | 'employer' | 'admin'
  profileCompleteness?: number
  primarySkills?: string[]
  locationPreference?: string
}) {
  if (!GA_TRACKING_ID) return

  // Set custom dimensions for user segmentation
  if (dimensions.userType) {
    window.gtag('config', GA_TRACKING_ID, {
      custom_map: { 'custom_parameter_1': 'user_type' }
    })
    window.gtag('event', 'set_user_properties', {
      user_type: dimensions.userType
    })
  }

  if (dimensions.profileCompleteness !== undefined) {
    window.gtag('event', 'set_user_properties', {
      profile_completeness: dimensions.profileCompleteness
    })
  }

  if (dimensions.primarySkills?.length) {
    window.gtag('event', 'set_user_properties', {
      primary_skills: dimensions.primarySkills.join(',')
    })
  }

  if (dimensions.locationPreference) {
    window.gtag('event', 'set_user_properties', {
      location_preference: dimensions.locationPreference
    })
  }
}

// Enhanced ecommerce tracking for job applications
export function trackJobApplicationEcommerce(jobData: {
  jobId: string
  jobTitle: string
  jobCompany: string
  jobCategory: string
  hourlyRate: number
  contractDuration?: string
}) {
  if (!GA_TRACKING_ID) return

  // Track as ecommerce purchase (job application)
  window.gtag('event', 'purchase', {
    transaction_id: `job_app_${jobData.jobId}_${Date.now()}`,
    value: 1, // Each application has value of 1 for conversion tracking
    currency: 'USD',
    items: [{
      item_id: jobData.jobId,
      item_name: jobData.jobTitle,
      item_category: jobData.jobCategory,
      item_brand: jobData.jobCompany,
      price: 1,
      quantity: 1
    }]
  })
}

// Recruiter dashboard analytics - track when recruiters view analytics
export function trackRecruiterDashboardView(dashboardData: {
  dashboardType: string
  dateRange: string
  metricsViewed: string[]
}) {
  trackEvent('recruiter_dashboard_view', 'Business Intelligence', dashboardData.dashboardType, 1, {
    dashboard_type: dashboardData.dashboardType,
    date_range: dashboardData.dateRange,
    metrics_viewed: dashboardData.metricsViewed.join(','),
    viewed_at: new Date().toISOString()
  })
}

// Export analytics data tracking
export function trackAnalyticsExport(exportData: {
  exportType: 'csv' | 'pdf' | 'json'
  dataType: string
  recordCount: number
}) {
  trackEvent('analytics_export', 'Data Export', exportData.dataType, exportData.recordCount, {
    export_type: exportData.exportType,
    data_type: exportData.dataType,
    record_count: exportData.recordCount,
    exported_at: new Date().toISOString()
  })
}