import { NextRequest, NextResponse } from 'next/server'
import { PerformanceMetric } from '@/lib/monitoring'

// Store metrics in memory for demo (in production, use a proper time-series database like InfluxDB)
const metricsStore: PerformanceMetric[] = []

export async function POST(request: NextRequest) {
  try {
    const { metrics }: { metrics: PerformanceMetric[] } = await request.json()

    if (!Array.isArray(metrics)) {
      return NextResponse.json(
        { error: 'Invalid metrics format' },
        { status: 400 }
      )
    }

    // Basic validation
    const validMetrics = metrics.filter(metric => 
      metric.id && 
      metric.name && 
      typeof metric.value === 'number' &&
      metric.timestamp
    )

    // Store metrics (in production, write to time-series database)
    metricsStore.push(...validMetrics)

    // Keep only recent metrics in memory (last 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    const recentMetrics = metricsStore.filter(metric => metric.timestamp > oneDayAgo)
    metricsStore.length = 0
    metricsStore.push(...recentMetrics)

    console.log(`Stored ${validMetrics.length} performance metrics`)

    return NextResponse.json({ 
      received: validMetrics.length,
      stored: metricsStore.length 
    })
  } catch (error) {
    console.error('Failed to process performance metrics:', error)
    return NextResponse.json(
      { error: 'Failed to process metrics' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const metricName = searchParams.get('metric')
    const hoursBack = parseInt(searchParams.get('hours') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')

    const cutoffTime = Date.now() - hoursBack * 60 * 60 * 1000

    let filteredMetrics = metricsStore.filter(metric => metric.timestamp > cutoffTime)

    if (metricName) {
      filteredMetrics = filteredMetrics.filter(metric => 
        metric.name.toLowerCase().includes(metricName.toLowerCase())
      )
    }

    // Sort by timestamp (newest first) and limit results
    const resultMetrics = filteredMetrics
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)

    // Calculate basic statistics
    const stats = calculateMetricStats(filteredMetrics)

    return NextResponse.json({
      metrics: resultMetrics,
      stats,
      total: filteredMetrics.length
    })
  } catch (error) {
    console.error('Failed to retrieve performance metrics:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
      { status: 500 }
    )
  }
}

function calculateMetricStats(metrics: PerformanceMetric[]) {
  if (metrics.length === 0) {
    return {
      count: 0,
      avg: 0,
      min: 0,
      max: 0,
      p50: 0,
      p95: 0,
      p99: 0
    }
  }

  const values = metrics.map(m => m.value).sort((a, b) => a - b)
  const sum = values.reduce((acc, val) => acc + val, 0)

  return {
    count: values.length,
    avg: sum / values.length,
    min: values[0],
    max: values[values.length - 1],
    p50: values[Math.floor(values.length * 0.5)],
    p95: values[Math.floor(values.length * 0.95)],
    p99: values[Math.floor(values.length * 0.99)]
  }
}