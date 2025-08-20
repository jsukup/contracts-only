'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

interface MetricStats {
  count: number
  avg: number
  min: number
  max: number
  p50: number
  p95: number
  p99: number
}

interface AlertNotification {
  id: string
  alertName: string
  metric: string
  value: number
  threshold: number
  timestamp: number
  url?: string
  acknowledged: boolean
}

interface ErrorReport {
  id: string
  message: string
  filename?: string
  lineno?: number
  timestamp: number
  url?: string
}

export default function MonitoringDashboard() {
  const [coreWebVitalsStats, setCoreWebVitalsStats] = useState<Record<string, MetricStats>>({})
  const [apiStats, setApiStats] = useState<MetricStats | null>(null)
  const [alerts, setAlerts] = useState<AlertNotification[]>([])
  const [errors, setErrors] = useState<ErrorReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMonitoringData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMonitoringData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchMonitoringData = async () => {
    try {
      setLoading(true)
      
      // Fetch Core Web Vitals
      const coreWebVitals = ['LCP', 'FID', 'CLS', 'FCP', 'TTFB', 'INP']
      const vitalsData: Record<string, MetricStats> = {}
      
      for (const metric of coreWebVitals) {
        const response = await fetch(`/api/monitoring/metrics?metric=${metric}&hours=1`)
        if (response.ok) {
          const data = await response.json()
          vitalsData[metric] = data.stats
        }
      }
      setCoreWebVitalsStats(vitalsData)

      // Fetch API performance
      const apiResponse = await fetch('/api/monitoring/metrics?metric=API_RESPONSE_TIME&hours=1')
      if (apiResponse.ok) {
        const apiData = await apiResponse.json()
        setApiStats(apiData.stats)
      }

      // Fetch alerts
      const alertsResponse = await fetch('/api/monitoring/alerts?hours=24&limit=20')
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json()
        setAlerts(alertsData.alerts)
      }

      // Fetch errors
      const errorsResponse = await fetch('/api/monitoring/errors?hours=24&limit=10')
      if (errorsResponse.ok) {
        const errorsData = await errorsResponse.json()
        setErrors(errorsData.errors)
      }
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error)
    } finally {
      setLoading(false)
    }
  }

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch('/api/monitoring/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, acknowledged: true })
      })
      
      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ))
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const getVitalsColor = (metric: string, value: number) => {
    const thresholds: Record<string, { good: number, poor: number }> = {
      'LCP': { good: 2500, poor: 4000 },
      'FID': { good: 100, poor: 300 },
      'CLS': { good: 0.1, poor: 0.25 },
      'FCP': { good: 1800, poor: 3000 },
      'TTFB': { good: 800, poor: 1800 },
      'INP': { good: 200, poor: 500 }
    }

    const threshold = thresholds[metric]
    if (!threshold) return 'text-gray-600'

    if (value <= threshold.good) return 'text-green-600'
    if (value <= threshold.poor) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Performance Monitoring</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Performance Monitoring</h1>
        <button 
          onClick={fetchMonitoringData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Core Web Vitals */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Core Web Vitals (Last Hour)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(coreWebVitalsStats).map(([metric, stats]) => (
            <Card key={metric}>
              <CardHeader>
                <CardTitle className="text-sm font-medium">{metric}</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.count > 0 ? (
                  <div className="space-y-2">
                    <div className={`text-2xl font-bold ${getVitalsColor(metric, stats.p95)}`}>
                      {metric === 'CLS' ? stats.p95.toFixed(3) : Math.round(stats.p95)}
                      {metric === 'CLS' ? '' : 'ms'}
                    </div>
                    <div className="text-xs text-gray-500">
                      P95: {metric === 'CLS' ? stats.p95.toFixed(3) : Math.round(stats.p95)}
                      {metric === 'CLS' ? '' : 'ms'}
                    </div>
                    <div className="text-xs text-gray-500">
                      Samples: {stats.count}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400">No data</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* API Performance */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">API Performance (Last Hour)</h2>
        <Card>
          <CardHeader>
            <CardTitle>API Response Times</CardTitle>
          </CardHeader>
          <CardContent>
            {apiStats && apiStats.count > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Average</div>
                  <div className="text-xl font-bold">{Math.round(apiStats.avg)}ms</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">P95</div>
                  <div className="text-xl font-bold">{Math.round(apiStats.p95)}ms</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Max</div>
                  <div className="text-xl font-bold">{Math.round(apiStats.max)}ms</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Requests</div>
                  <div className="text-xl font-bold">{apiStats.count}</div>
                </div>
              </div>
            ) : (
              <div className="text-gray-400">No API requests recorded</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Active Alerts ({alerts.filter(a => !a.acknowledged).length})
        </h2>
        <Card>
          <CardContent>
            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map(alert => (
                  <div 
                    key={alert.id} 
                    className={`p-3 rounded-lg border ${
                      alert.acknowledged 
                        ? 'bg-gray-50 border-gray-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className={`font-medium ${alert.acknowledged ? 'text-gray-600' : 'text-red-800'}`}>
                          {alert.alertName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {alert.metric}: {alert.value} (threshold: {alert.threshold})
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatTimestamp(alert.timestamp)}
                          {alert.url && ` • ${alert.url}`}
                        </div>
                      </div>
                      {!alert.acknowledged && (
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-center py-8">No alerts</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Errors */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Errors</h2>
        <Card>
          <CardContent>
            {errors.length > 0 ? (
              <div className="space-y-3">
                {errors.map(error => (
                  <div key={error.id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="font-medium text-red-800">
                      {error.message}
                    </div>
                    {error.filename && (
                      <div className="text-sm text-gray-600">
                        {error.filename}:{error.lineno}
                      </div>
                    )}
                    <div className="text-xs text-gray-400">
                      {formatTimestamp(error.timestamp)}
                      {error.url && ` • ${error.url}`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-center py-8">No errors recorded</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}