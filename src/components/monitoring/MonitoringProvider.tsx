'use client'

import { useEffect } from 'react'
import { initializeMonitoring, performanceMonitor } from '@/lib/monitoring'

export default function MonitoringProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize monitoring only on client side and in production
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      const config = initializeMonitoring({
        enabled: true,
        sampling: parseFloat(process.env.NEXT_PUBLIC_MONITORING_SAMPLING || '0.1'),
        endpoint: '/api/monitoring/metrics',
        batchSize: 50,
        flushInterval: 30000, // 30 seconds
        enableRUM: true,
        enableSynthetic: false // Disable synthetic monitoring on client
      })

      console.log('Performance monitoring initialized', config)

      // Add custom metrics for job board specific events
      initializeJobBoardMonitoring()

      // Cleanup on unmount
      return () => {
        performanceMonitor.destroy()
      }
    }
  }, [])

  return <>{children}</>
}

function initializeJobBoardMonitoring() {
  // Track job search performance
  const originalFetch = window.fetch
  window.fetch = async (...args) => {
    const url = typeof args[0] === 'string' ? args[0] : args[0].url
    
    // Track specific API endpoints
    if (url.includes('/api/jobs')) {
      const start = performance.now()
      
      try {
        const response = await originalFetch(...args)
        const duration = performance.now() - start
        
        performanceMonitor.recordMetric({
          id: `job-search-${Date.now()}`,
          name: 'JOB_SEARCH_TIME',
          value: duration,
          unit: 'ms',
          timestamp: Date.now(),
          url
        })

        return response
      } catch (error) {
        performanceMonitor.recordMetric({
          id: `job-search-error-${Date.now()}`,
          name: 'JOB_SEARCH_ERROR',
          value: 1,
          unit: 'count',
          timestamp: Date.now(),
          url
        })
        throw error
      }
    }

    return originalFetch(...args)
  }

  // Track user interactions with enhanced job-specific data
  const trackUserInteraction = (eventName: string, element?: string, metadata?: Record<string, unknown>) => {
    performanceMonitor.recordMetric({
      id: `user-interaction-${Date.now()}`,
      name: `USER_${eventName.toUpperCase()}`,
      value: 1,
      unit: 'count',
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: (navigator as any).connection?.effectiveType
    })

    // Send additional data for Google Analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, {
        event_category: 'User Engagement',
        event_label: element,
        custom_parameter_1: metadata ? JSON.stringify(metadata) : undefined,
        page_location: window.location.href
      })
    }
  }

  // Enhanced job application and interaction tracking
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    const jobCard = target.closest('[data-job-id]')
    const jobId = jobCard?.getAttribute('data-job-id')
    
    if (target.closest('[data-track="apply-job"]')) {
      const jobTitle = jobCard?.querySelector('[data-job-title]')?.textContent
      const jobCompany = jobCard?.querySelector('[data-job-company]')?.textContent
      const jobRate = jobCard?.querySelector('[data-job-rate]')?.textContent
      
      trackUserInteraction('job_apply', 'apply_button', {
        jobId,
        jobTitle,
        jobCompany,
        jobRate,
        source: 'job_card'
      })

      // Track conversion funnel for recruiters
      performanceMonitor.recordMetric({
        id: `conversion-apply-${Date.now()}`,
        name: 'JOB_APPLICATION_CONVERSION',
        value: 1,
        unit: 'count',
        timestamp: Date.now(),
        url: window.location.href
      })
    } else if (target.closest('[data-track="view-job"]')) {
      const jobTitle = jobCard?.querySelector('[data-job-title]')?.textContent
      
      trackUserInteraction('job_view', 'view_button', {
        jobId,
        jobTitle,
        source: 'job_card'
      })

      performanceMonitor.recordMetric({
        id: `job-view-${Date.now()}`,
        name: 'JOB_VIEW',
        value: 1,
        unit: 'count',
        timestamp: Date.now(),
        url: window.location.href
      })
    } else if (target.closest('[data-track="search-jobs"]')) {
      const searchQuery = (document.querySelector('[data-search-input]') as HTMLInputElement)?.value
      
      trackUserInteraction('job_search', 'search_button', {
        searchQuery,
        source: 'search_bar'
      })
    } else if (target.closest('[data-track="filter-jobs"]')) {
      const filterType = target.getAttribute('data-filter-type')
      const filterValue = target.getAttribute('data-filter-value')
      
      trackUserInteraction('job_filter', 'filter_control', {
        filterType,
        filterValue,
        source: 'filter_sidebar'
      })
    }
  })

  // Track form submissions
  document.addEventListener('submit', (event) => {
    const target = event.target as HTMLFormElement
    
    if (target.dataset.track) {
      trackUserInteraction('form_submit', target.dataset.track)
    }
  })

  // Track page visibility changes (user engagement)
  let pageVisibilityStart = Date.now()
  
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      const visibilityDuration = Date.now() - pageVisibilityStart
      
      performanceMonitor.recordMetric({
        id: `page-visibility-${Date.now()}`,
        name: 'PAGE_VISIBILITY_DURATION',
        value: visibilityDuration,
        unit: 'ms',
        timestamp: Date.now(),
        url: window.location.href
      })
    } else {
      pageVisibilityStart = Date.now()
    }
  })

  // Track beforeunload (session duration)
  window.addEventListener('beforeunload', () => {
    const sessionDuration = Date.now() - pageVisibilityStart
    
    performanceMonitor.recordMetric({
      id: `session-duration-${Date.now()}`,
      name: 'SESSION_DURATION',
      value: sessionDuration,
      unit: 'ms',
      timestamp: Date.now(),
      url: window.location.href
    })

    // Force flush remaining metrics
    performanceMonitor.flush()
  })
}