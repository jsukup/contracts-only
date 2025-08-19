// Lazy-loaded components for better performance
// Uses React.lazy and dynamic imports to split bundles

'use client'

import { lazy, Suspense, ComponentType, useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

// Loading fallback components
const CardSkeleton = () => (
  <Card className="animate-pulse">
    <CardHeader>
      <div className="h-6 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
      </div>
    </CardContent>
  </Card>
)

const ChartSkeleton = () => (
  <Card className="animate-pulse">
    <CardHeader>
      <div className="h-6 bg-gray-200 rounded w-1/2" />
    </CardHeader>
    <CardContent>
      <div className="h-64 bg-gray-200 rounded" />
    </CardContent>
  </Card>
)

const FormSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-10 bg-gray-200 rounded" />
    <div className="h-10 bg-gray-200 rounded" />
    <div className="h-32 bg-gray-200 rounded" />
    <div className="h-10 bg-gray-200 rounded w-32" />
  </div>
)

const ListSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center space-x-4">
        <div className="h-12 w-12 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="h-8 w-20 bg-gray-200 rounded" />
      </div>
    ))}
  </div>
)

// Lazy-loaded heavy components
export const LazyJobFilters = lazy(() => 
  import('@/components/jobs/AdvancedJobFilters').then(module => ({
    default: module.default
  }))
)

export const LazyAnalyticsChart = lazy(() => 
  import('@/components/analytics/AnalyticsChart').then(module => ({
    default: module.default
  }))
)

export const LazyJobPostingForm = lazy(() => 
  import('@/components/jobs/JobPostingForm').then(module => ({
    default: module.default
  }))
)

export const LazyUserProfileForm = lazy(() => 
  import('@/components/profile/UserProfileForm').then(module => ({
    default: module.default
  }))
)

export const LazyApplicationsList = lazy(() => 
  import('@/components/applications/ApplicationsList').then(module => ({
    default: module.default
  }))
)

export const LazyNotificationCenter = lazy(() => 
  import('@/components/notifications/NotificationCenter').then(module => ({
    default: module.default
  }))
)

// HOC for wrapping components with Suspense and loading states
function withLazyLoading<T extends object>(
  LazyComponent: ComponentType<T>,
  LoadingComponent: ComponentType = CardSkeleton
) {
  return function LazyWrapper(props: T) {
    return (
      <Suspense fallback={<LoadingComponent />}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}

// Pre-configured lazy components with appropriate loading states
export const JobFiltersLazy = withLazyLoading(LazyJobFilters, FormSkeleton)
export const AnalyticsChartLazy = withLazyLoading(LazyAnalyticsChart, ChartSkeleton)
export const JobPostingFormLazy = withLazyLoading(LazyJobPostingForm, FormSkeleton)
export const UserProfileFormLazy = withLazyLoading(LazyUserProfileForm, FormSkeleton)
export const ApplicationsListLazy = withLazyLoading(LazyApplicationsList, ListSkeleton)
export const NotificationCenterLazy = withLazyLoading(LazyNotificationCenter, CardSkeleton)

// Utility for conditional lazy loading based on viewport
export function createViewportLazyComponent<T extends object>(
  LazyComponent: ComponentType<T>,
  LoadingComponent: ComponentType = CardSkeleton,
  threshold = 0.1
) {
  return function ViewportLazyWrapper(props: T) {
    const [isVisible, setIsVisible] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observer.disconnect()
          }
        },
        { threshold }
      )

      if (ref.current) {
        observer.observe(ref.current)
      }

      return () => observer.disconnect()
    }, [])

    return (
      <div ref={ref}>
        {isVisible ? (
          <Suspense fallback={<LoadingComponent />}>
            <LazyComponent {...props} />
          </Suspense>
        ) : (
          <LoadingComponent />
        )}
      </div>
    )
  }
}

// Critical resource preloader
export function preloadCriticalComponents() {
  if (typeof window !== 'undefined') {
    // Preload components likely to be needed soon
    const criticalImports = [
      () => import('@/components/jobs/AdvancedJobFilters'),
      () => import('@/components/jobs/JobPostingForm'),
      () => import('@/components/profile/UserProfileForm')
    ]

    criticalImports.forEach(importFn => {
      importFn().catch(error => {
        console.warn('Failed to preload component:', error)
      })
    })
  }
}

// Component for monitoring and displaying performance metrics
export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<any>(null)
  const [showMetrics, setShowMetrics] = useState(false)

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      import('@/lib/performance').then(({ PerformanceMonitor }) => {
        const monitor = PerformanceMonitor.getInstance()
        
        // Get Core Web Vitals
        monitor.getCoreWebVitals().then(vitals => {
          setMetrics({
            ...vitals,
            ...monitor.reportMetrics()
          })
        })
      })
    }
  }, [])

  if (process.env.NODE_ENV !== 'development' || !metrics) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setShowMetrics(!showMetrics)}
        className="bg-blue-500 text-white px-3 py-2 rounded text-xs"
      >
        Perf
      </button>
      
      {showMetrics && (
        <div className="absolute bottom-12 right-0 bg-white border rounded shadow-lg p-4 w-64 text-xs">
          <h4 className="font-semibold mb-2">Performance Metrics</h4>
          <div className="space-y-1">
            {Object.entries(metrics.customMetrics || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span>{key}:</span>
                <span>{typeof value === 'number' ? `${value.toFixed(2)}ms` : value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}