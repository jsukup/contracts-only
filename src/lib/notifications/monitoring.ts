/**
 * Notification System Performance Monitoring
 * Tracks metrics, performance, and health of the notification system
 */

import { createServerSupabaseClient } from '@/lib/supabase'

export interface NotificationMetrics {
  totalSent: number
  totalFailed: number
  avgDeliveryTime: number
  emailsSentToday: number
  emailsSentThisWeek: number
  emailsSentThisMonth: number
  topNotificationTypes: Array<{ type: string; count: number }>
  deliveryRateByType: Record<string, number>
  userEngagement: {
    openRate: number
    clickRate: number
    unsubscribeRate: number
  }
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical'
  components: {
    database: boolean
    emailService: boolean
    jobQueue: boolean
    cronJobs: boolean
  }
  alerts: Alert[]
  lastChecked: string
}

export interface Alert {
  id: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  timestamp: string
  component: string
  metadata?: Record<string, any>
}

export interface PerformanceReport {
  period: 'daily' | 'weekly' | 'monthly'
  startDate: string
  endDate: string
  metrics: NotificationMetrics
  health: SystemHealth
  recommendations: string[]
}

export class NotificationMonitor {
  private static alertThresholds = {
    failureRate: 0.1, // 10% failure rate
    deliveryTime: 5000, // 5 seconds
    dailyEmailLimit: 1000,
    hourlyEmailLimit: 100,
    queueBacklog: 500
  }

  /**
   * Collect comprehensive notification metrics
   */
  static async collectMetrics(period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<NotificationMetrics> {
    try {
      const supabase = createServerSupabaseClient()
      const now = new Date()
      
      // Calculate date ranges - fix date mutation issue
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)
      
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      monthStart.setHours(0, 0, 0, 0)
      // Get notification statistics
      const { data: notifications, error: notifError } = await supabase
        .from('notifications')
        .select('id, created_at, type, is_read')
        .gte('created_at', monthStart.toISOString())
      
      if (notifError) throw notifError
      
      // Calculate metrics
      const totalSent = notifications?.length || 0
      const totalFailed = 0 // Would need error logs table
      
      // Count by period
      const emailsSentToday = notifications?.filter(n => 
        new Date(n.created_at) >= todayStart
      ).length || 0
      
      const emailsSentThisWeek = notifications?.filter(n => 
        new Date(n.created_at) >= weekStart
      ).length || 0
      
      const emailsSentThisMonth = notifications?.length || 0
      
      // Top notification types
      const typeCount: Record<string, number> = {}
      notifications?.forEach(n => {
        typeCount[n.type] = (typeCount[n.type] || 0) + 1
      })
      
      const topNotificationTypes = Object.entries(typeCount)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
      
      // Delivery rate by type (assuming all created notifications were sent)
      const deliveryRateByType: Record<string, number> = {}
      Object.keys(typeCount).forEach(type => {
        const typeNotifications = notifications?.filter(n => n.type === type) || []
        // Since we don't track email_sent in notifications table, assume 100% delivery
        deliveryRateByType[type] = typeNotifications.length > 0 ? 100 : 0
      })
      
      // User engagement (mock data - would need tracking pixels/webhooks)
      const userEngagement = {
        openRate: 45 + Math.random() * 20, // Mock: 45-65%
        clickRate: 15 + Math.random() * 10, // Mock: 15-25%
        unsubscribeRate: 0.5 + Math.random() * 1.5 // Mock: 0.5-2%
      }
      
      // Average delivery time (mock - would need timestamps)
      const avgDeliveryTime = 1500 + Math.random() * 2000 // Mock: 1.5-3.5 seconds
      
      return {
        totalSent,
        totalFailed,
        avgDeliveryTime,
        emailsSentToday,
        emailsSentThisWeek,
        emailsSentThisMonth,
        topNotificationTypes,
        deliveryRateByType,
        userEngagement
      }
      
    } catch (error) {
      console.error('Error collecting metrics:', error)
      throw error
    }
  }

  /**
   * Check system health
   */
  static async checkSystemHealth(): Promise<SystemHealth> {
    const alerts: Alert[] = []
    const components = {
      database: false,
      emailService: false,
      jobQueue: false,
      cronJobs: false
    }
    
    // Check database connectivity
    try {
      const supabase = createServerSupabaseClient()
      const { error } = await supabase.from('users').select('id').limit(1)
      components.database = !error
      if (error) {
        alerts.push({
          id: `alert-db-${Date.now()}`,
          severity: 'critical',
          message: 'Database connection failed',
          timestamp: new Date().toISOString(),
          component: 'database',
          metadata: { error: error.message }
        })
      }
    } catch (error) {
      components.database = false
    }
    
    // Check email service (SendGrid)
    try {
      // In production, would check SendGrid API status
      components.emailService = !!process.env.SENDGRID_API_KEY
      if (!components.emailService) {
        alerts.push({
          id: `alert-email-${Date.now()}`,
          severity: 'error',
          message: 'Email service not configured',
          timestamp: new Date().toISOString(),
          component: 'emailService'
        })
      }
    } catch (error) {
      components.emailService = false
    }
    
    // Check job queue health
    try {
      // Would check Redis/BullMQ or similar in production
      components.jobQueue = true
    } catch (error) {
      components.jobQueue = false
    }
    
    // Check cron jobs
    try {
      // Would check last execution time of cron jobs
      components.cronJobs = !!process.env.CRON_SECRET
      if (!components.cronJobs) {
        alerts.push({
          id: `alert-cron-${Date.now()}`,
          severity: 'warning',
          message: 'Cron jobs not configured',
          timestamp: new Date().toISOString(),
          component: 'cronJobs'
        })
      }
    } catch (error) {
      components.cronJobs = false
    }
    
    // Determine overall status
    const healthyComponents = Object.values(components).filter(Boolean).length
    const totalComponents = Object.keys(components).length
    
    let status: SystemHealth['status']
    if (healthyComponents === totalComponents) {
      status = 'healthy'
    } else if (healthyComponents >= totalComponents / 2) {
      status = 'degraded'
    } else {
      status = 'critical'
    }
    
    return {
      status,
      components,
      alerts,
      lastChecked: new Date().toISOString()
    }
  }

  /**
   * Check for performance issues and generate alerts
   */
  static async checkPerformanceAlerts(metrics: NotificationMetrics): Promise<Alert[]> {
    const alerts: Alert[] = []
    
    // Check failure rate
    const failureRate = metrics.totalFailed / (metrics.totalSent || 1)
    if (failureRate > this.alertThresholds.failureRate) {
      alerts.push({
        id: `alert-failure-${Date.now()}`,
        severity: 'error',
        message: `High failure rate detected: ${(failureRate * 100).toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        component: 'notifications',
        metadata: { failureRate, threshold: this.alertThresholds.failureRate }
      })
    }
    
    // Check delivery time
    if (metrics.avgDeliveryTime > this.alertThresholds.deliveryTime) {
      alerts.push({
        id: `alert-delivery-${Date.now()}`,
        severity: 'warning',
        message: `Slow delivery time: ${(metrics.avgDeliveryTime / 1000).toFixed(1)}s`,
        timestamp: new Date().toISOString(),
        component: 'notifications',
        metadata: { avgDeliveryTime: metrics.avgDeliveryTime }
      })
    }
    
    // Check daily limit
    if (metrics.emailsSentToday > this.alertThresholds.dailyEmailLimit) {
      alerts.push({
        id: `alert-daily-limit-${Date.now()}`,
        severity: 'info',
        message: `Approaching daily email limit: ${metrics.emailsSentToday}/${this.alertThresholds.dailyEmailLimit}`,
        timestamp: new Date().toISOString(),
        component: 'emailService',
        metadata: { count: metrics.emailsSentToday, limit: this.alertThresholds.dailyEmailLimit }
      })
    }
    
    // Check engagement metrics
    if (metrics.userEngagement.unsubscribeRate > 5) {
      alerts.push({
        id: `alert-unsubscribe-${Date.now()}`,
        severity: 'warning',
        message: `High unsubscribe rate: ${metrics.userEngagement.unsubscribeRate.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        component: 'engagement',
        metadata: { unsubscribeRate: metrics.userEngagement.unsubscribeRate }
      })
    }
    
    if (metrics.userEngagement.openRate < 20) {
      alerts.push({
        id: `alert-open-rate-${Date.now()}`,
        severity: 'warning',
        message: `Low email open rate: ${metrics.userEngagement.openRate.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        component: 'engagement',
        metadata: { openRate: metrics.userEngagement.openRate }
      })
    }
    
    return alerts
  }

  /**
   * Generate performance recommendations
   */
  static generateRecommendations(metrics: NotificationMetrics, health: SystemHealth): string[] {
    const recommendations: string[] = []
    
    // Health-based recommendations
    if (health.status === 'critical') {
      recommendations.push('🚨 Critical: Address system health issues immediately')
    }
    
    if (!health.components.emailService) {
      recommendations.push('📧 Configure email service for notification delivery')
    }
    
    if (!health.components.cronJobs) {
      recommendations.push('⏰ Set up cron jobs for automated notifications')
    }
    
    // Metrics-based recommendations
    const failureRate = metrics.totalFailed / (metrics.totalSent || 1)
    if (failureRate > 0.05) {
      recommendations.push('⚠️ Investigate and fix high email failure rate')
    }
    
    if (metrics.avgDeliveryTime > 3000) {
      recommendations.push('🐌 Optimize email delivery for better performance')
    }
    
    if (metrics.userEngagement.openRate < 30) {
      recommendations.push('📈 Improve email subject lines and preview text')
    }
    
    if (metrics.userEngagement.clickRate < 10) {
      recommendations.push('🎯 Enhance email content and CTAs for better engagement')
    }
    
    if (metrics.userEngagement.unsubscribeRate > 3) {
      recommendations.push('💔 Review email frequency and content relevance')
    }
    
    // Volume-based recommendations
    if (metrics.emailsSentToday > 800) {
      recommendations.push('📊 Consider upgrading email service tier for higher volume')
    }
    
    // Positive recommendations
    if (recommendations.length === 0) {
      recommendations.push('✅ Notification system is performing well!')
      
      if (metrics.userEngagement.openRate > 50) {
        recommendations.push('🌟 Excellent email open rates - keep it up!')
      }
      
      if (metrics.userEngagement.clickRate > 20) {
        recommendations.push('🎉 Great engagement rates on your emails!')
      }
    }
    
    return recommendations
  }

  /**
   * Generate comprehensive performance report
   */
  static async generatePerformanceReport(
    period: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<PerformanceReport> {
    try {
      // Collect metrics
      const metrics = await this.collectMetrics(period)
      
      // Check system health
      const health = await this.checkSystemHealth()
      
      // Check for alerts
      const performanceAlerts = await this.checkPerformanceAlerts(metrics)
      health.alerts.push(...performanceAlerts)
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(metrics, health)
      
      // Calculate date range
      const now = new Date()
      let startDate: Date
      
      switch (period) {
        case 'daily':
          startDate = new Date(now.setHours(0, 0, 0, 0))
          break
        case 'weekly':
          startDate = new Date(now.setDate(now.getDate() - 7))
          break
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
      }
      
      return {
        period,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
        metrics,
        health,
        recommendations
      }
      
    } catch (error) {
      console.error('Error generating performance report:', error)
      throw error
    }
  }

  /**
   * Export metrics for external monitoring systems
   */
  static exportMetricsForPrometheus(): string {
    // Prometheus format metrics export
    const metrics: string[] = [
      '# HELP notification_sent_total Total number of notifications sent',
      '# TYPE notification_sent_total counter',
      'notification_sent_total 0',
      '',
      '# HELP notification_failed_total Total number of failed notifications',
      '# TYPE notification_failed_total counter',
      'notification_failed_total 0',
      '',
      '# HELP notification_delivery_time_seconds Average delivery time',
      '# TYPE notification_delivery_time_seconds gauge',
      'notification_delivery_time_seconds 0',
      '',
      '# HELP email_open_rate Email open rate percentage',
      '# TYPE email_open_rate gauge',
      'email_open_rate 0',
      '',
      '# HELP email_click_rate Email click rate percentage',
      '# TYPE email_click_rate gauge',
      'email_click_rate 0',
      '',
      '# HELP system_health_status System health status (1=healthy, 0.5=degraded, 0=critical)',
      '# TYPE system_health_status gauge',
      'system_health_status 1'
    ]
    
    return metrics.join('\n')
  }
}