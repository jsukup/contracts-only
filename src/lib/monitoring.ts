// Web Vitals metric interface
export interface WebVitalsMetric {
  id: string
  name: string
  value: number
  delta: number
  rating: 'good' | 'needs-improvement' | 'poor'
}

// Performance monitoring types
export interface PerformanceMetric {
  id: string
  name: string
  value: number
  unit: string
  timestamp: number
  url?: string
  userAgent?: string
  connectionType?: string
}

export interface AlertRule {
  id: string
  name: string
  metric: string
  condition: 'gt' | 'lt' | 'eq'
  threshold: number
  enabled: boolean
  cooldownMs: number
  lastTriggered?: number
}

export interface MonitoringConfig {
  enabled: boolean
  sampling: number // 0-1, percentage of users to monitor
  endpoint: string
  maxRetries: number
  batchSize: number
  flushInterval: number
  enableRUM: boolean // Real User Monitoring
  enableSynthetic: boolean // Synthetic monitoring
}

class PerformanceMonitor {
  private config: MonitoringConfig
  private metrics: PerformanceMetric[] = []
  private alerts: AlertRule[] = []
  private flushTimer?: NodeJS.Timeout
  private isFlushInProgress = false

  constructor(config: MonitoringConfig) {
    this.config = config
    
    if (typeof window !== 'undefined' && this.config.enabled) {
      this.initializeClientMonitoring()
    }
  }

  private initializeClientMonitoring() {
    // Core Web Vitals monitoring
    if (this.config.enableRUM) {
      this.initializeCoreWebVitals()
      this.initializeCustomMetrics()
      this.initializeErrorTracking()
      this.initializeResourceTiming()
    }

    // Start periodic flushing
    this.startPeriodicFlush()
  }

  private initializeCoreWebVitals() {
    // Dynamic import to avoid SSR issues
    import('web-vitals').then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
      const reportMetric = (metric: WebVitalsMetric) => {
        if (Math.random() <= this.config.sampling) {
          this.recordMetric({
            id: `${metric.name}-${Date.now()}`,
            name: metric.name,
            value: metric.value,
            unit: metric.name === 'CLS' ? 'score' : 'ms',
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            connectionType: (navigator as any).connection?.effectiveType
          })
        }
      }

      // Register all Core Web Vitals
      onCLS(reportMetric)
      onFCP(reportMetric) 
      onINP(reportMetric) // Interaction to Next Paint
      onLCP(reportMetric)
      onTTFB(reportMetric)
    })
  }

  private initializeCustomMetrics() {
    // Note: Fetch interception is handled by MonitoringProvider for job-board specific tracking
    // This prevents duplicate fetch interception that can cause RSC payload errors
    
    // Monitor page load metrics
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      if (navigation) {
        this.recordMetric({
          id: `dom-content-loaded-${Date.now()}`,
          name: 'DOM_CONTENT_LOADED',
          value: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          unit: 'ms',
          timestamp: Date.now(),
          url: window.location.href
        })

        this.recordMetric({
          id: `page-load-${Date.now()}`,
          name: 'PAGE_LOAD_TIME',
          value: navigation.loadEventEnd - navigation.fetchStart,
          unit: 'ms',
          timestamp: Date.now(),
          url: window.location.href
        })
      }
    })
  }

  private initializeErrorTracking() {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.recordMetric({
        id: `js-error-${Date.now()}`,
        name: 'JAVASCRIPT_ERROR',
        value: 1,
        unit: 'count',
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      })

      // Send error details to error tracking service
      this.reportError({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: Date.now(),
        url: window.location.href
      })
    })

    // Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.recordMetric({
        id: `promise-rejection-${Date.now()}`,
        name: 'UNHANDLED_PROMISE_REJECTION',
        value: 1,
        unit: 'count',
        timestamp: Date.now(),
        url: window.location.href
      })

      this.reportError({
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        timestamp: Date.now(),
        url: window.location.href
      })
    })
  }

  private initializeResourceTiming() {
    // Monitor resource loading performance
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming
          
          this.recordMetric({
            id: `resource-load-${Date.now()}`,
            name: 'RESOURCE_LOAD_TIME',
            value: resource.duration,
            unit: 'ms',
            timestamp: Date.now(),
            url: resource.name
          })
        }
      }
    })

    observer.observe({ entryTypes: ['resource'] })
  }

  // Removed interceptFetchCalls method to prevent duplicate fetch interception
  // Fetch monitoring is handled by MonitoringProvider for job-board specific tracking

  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric)
    
    // Check alert rules
    this.checkAlerts(metric)
    
    // Auto-flush if batch is full
    if (this.metrics.length >= this.config.batchSize) {
      this.flush()
    }
  }

  private checkAlerts(metric: PerformanceMetric) {
    const applicableAlerts = this.alerts.filter(alert => 
      alert.enabled && 
      alert.metric === metric.name &&
      (!alert.lastTriggered || Date.now() - alert.lastTriggered > alert.cooldownMs)
    )

    for (const alert of applicableAlerts) {
      let shouldTrigger = false

      switch (alert.condition) {
        case 'gt':
          shouldTrigger = metric.value > alert.threshold
          break
        case 'lt':
          shouldTrigger = metric.value < alert.threshold
          break
        case 'eq':
          shouldTrigger = metric.value === alert.threshold
          break
      }

      if (shouldTrigger) {
        this.triggerAlert(alert, metric)
        alert.lastTriggered = Date.now()
      }
    }
  }

  private async triggerAlert(alert: AlertRule, metric: PerformanceMetric) {
    const alertData = {
      alertId: alert.id,
      alertName: alert.name,
      metric: metric.name,
      value: metric.value,
      threshold: alert.threshold,
      timestamp: Date.now(),
      url: metric.url
    }

    try {
      // Send to alerting endpoint
      await fetch('/api/monitoring/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData)
      })
    } catch (error) {
      console.error('Failed to send alert:', error)
    }
  }

  private async reportError(errorData: {
    message: string
    stack?: string
    url?: string
    timestamp?: number
    userAgent?: string
    userId?: string
  }) {
    try {
      await fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      })
    } catch (error) {
      console.error('Failed to report error:', error)
    }
  }

  private startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      if (this.metrics.length > 0) {
        this.flush()
      }
    }, this.config.flushInterval)
  }

  async flush() {
    if (this.isFlushInProgress || this.metrics.length === 0) return

    this.isFlushInProgress = true
    const metricsToSend = [...this.metrics]
    this.metrics = []

    let retries = 0
    while (retries < this.config.maxRetries) {
      try {
        await fetch(this.config.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metrics: metricsToSend })
        })
        break
      } catch (error) {
        retries++
        if (retries >= this.config.maxRetries) {
          console.error('Failed to send metrics after retries:', error)
          // Store in localStorage as fallback
          this.storeMetricsLocally(metricsToSend)
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000 * retries))
        }
      }
    }

    this.isFlushInProgress = false
  }

  private storeMetricsLocally(metrics: PerformanceMetric[]) {
    try {
      const stored = localStorage.getItem('failed-metrics') || '[]'
      const failedMetrics = JSON.parse(stored)
      failedMetrics.push(...metrics)
      
      // Keep only recent metrics to prevent storage overflow
      const recent = failedMetrics.slice(-1000)
      localStorage.setItem('failed-metrics', JSON.stringify(recent))
    } catch (error) {
      console.error('Failed to store metrics locally:', error)
    }
  }

  addAlert(alert: AlertRule) {
    this.alerts.push(alert)
  }

  removeAlert(alertId: string) {
    this.alerts = this.alerts.filter(alert => alert.id !== alertId)
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  async getStoredFailedMetrics(): Promise<PerformanceMetric[]> {
    try {
      const stored = localStorage.getItem('failed-metrics') || '[]'
      return JSON.parse(stored)
    } catch (error) {
      console.error('Failed to retrieve stored metrics:', error)
      return []
    }
  }

  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    
    // Flush remaining metrics
    if (this.metrics.length > 0) {
      this.flush()
    }
  }
}

// Synthetic monitoring for server-side checks
export class SyntheticMonitor {
  private config: MonitoringConfig
  private checks: SyntheticCheck[] = []

  constructor(config: MonitoringConfig) {
    this.config = config
  }

  addCheck(check: SyntheticCheck) {
    this.checks.push(check)
  }

  async runChecks(): Promise<SyntheticResult[]> {
    const results: SyntheticResult[] = []

    for (const check of this.checks) {
      if (!check.enabled) continue

      try {
        const start = Date.now()
        const response = await fetch(check.url, {
          method: check.method || 'GET',
          headers: check.headers,
          body: check.body
        })
        
        const duration = Date.now() - start
        const success = check.expectedStatus ? 
          response.status === check.expectedStatus : 
          response.ok

        results.push({
          checkId: check.id,
          url: check.url,
          success,
          responseTime: duration,
          statusCode: response.status,
          timestamp: Date.now(),
          error: success ? undefined : `Unexpected status: ${response.status}`
        })
      } catch (error) {
        results.push({
          checkId: check.id,
          url: check.url,
          success: false,
          responseTime: 0,
          statusCode: 0,
          timestamp: Date.now(),
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  }
}

export interface SyntheticCheck {
  id: string
  name: string
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
  expectedStatus?: number
  enabled: boolean
  interval: number
}

export interface SyntheticResult {
  checkId: string
  url: string
  success: boolean
  responseTime: number
  statusCode: number
  timestamp: number
  error?: string
}

// Default configuration
export const defaultMonitoringConfig: MonitoringConfig = {
  enabled: process.env.NODE_ENV === 'production',
  sampling: 0.1, // Monitor 10% of users
  endpoint: '/api/monitoring/metrics',
  maxRetries: 3,
  batchSize: 50,
  flushInterval: 30000, // 30 seconds
  enableRUM: true,
  enableSynthetic: true
}

// Global monitor instance
export const performanceMonitor = new PerformanceMonitor(defaultMonitoringConfig)

// Synthetic monitor for server-side
export const syntheticMonitor = new SyntheticMonitor(defaultMonitoringConfig)

// Helper function to initialize monitoring
export function initializeMonitoring(config?: Partial<MonitoringConfig>) {
  const finalConfig = { ...defaultMonitoringConfig, ...config }
  
  if (typeof window !== 'undefined') {
    // Add default alert rules
    performanceMonitor.addAlert({
      id: 'high-lcp',
      name: 'High Largest Contentful Paint',
      metric: 'LCP',
      condition: 'gt',
      threshold: 2500,
      enabled: true,
      cooldownMs: 60000 // 1 minute cooldown
    })

    performanceMonitor.addAlert({
      id: 'high-cls',
      name: 'High Cumulative Layout Shift',
      metric: 'CLS',
      condition: 'gt',
      threshold: 0.1,
      enabled: true,
      cooldownMs: 60000
    })

    performanceMonitor.addAlert({
      id: 'slow-api',
      name: 'Slow API Response',
      metric: 'API_RESPONSE_TIME',
      condition: 'gt',
      threshold: 5000,
      enabled: true,
      cooldownMs: 300000 // 5 minutes
    })
  }

  return finalConfig
}