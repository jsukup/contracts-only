// Performance optimization utilities
// Implements code splitting, lazy loading, and performance monitoring

import React, { ComponentType, lazy, Suspense } from 'react'

// Dynamic import wrapper with error handling
export function dynamicImport<T = any>(
  importFunction: () => Promise<{ default: ComponentType<T> }>,
  options: {
    loading?: ComponentType
    error?: ComponentType<{ error: Error; retry: () => void }>
    ssr?: boolean
    suspense?: boolean
  } = {}
) {
  return import('next/dynamic').then(({ default: dynamic }) =>
    dynamic(importFunction, {
      loading: options.loading || (() => (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
        </div>
      )),
      ssr: options.ssr ?? true,
      suspense: options.suspense ?? false,
    })
  )
}

// Preload critical routes
export const preloadRoutes = {
  dashboard: () => import('@/app/dashboard/page'),
  jobs: () => import('@/app/jobs/page'),
  analytics: () => import('@/app/analytics/page'),
  pricing: () => import('@/app/pricing/page'),
  notifications: () => import('@/app/notifications/page'),
  onboarding: () => import('@/app/onboarding/page'),
}

// Preload function for route prefetching
export function preloadRoute(route: keyof typeof preloadRoutes) {
  if (typeof window !== 'undefined') {
    preloadRoutes[route]().catch(console.error)
  }
}

// Image optimization utilities
export interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  priority?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  sizes?: string
  className?: string
}

export function generateImageSizes(breakpoints: {
  mobile: number
  tablet: number
  desktop: number
}) {
  return `
    (max-width: 768px) ${breakpoints.mobile}px,
    (max-width: 1024px) ${breakpoints.tablet}px,
    ${breakpoints.desktop}px
  `
}

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, number> = new Map()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // Measure component render time
  startMeasure(name: string) {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(`${name}-start`)
    }
  }

  endMeasure(name: string) {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(`${name}-end`)
      window.performance.measure(name, `${name}-start`, `${name}-end`)
      
      const measure = window.performance.getEntriesByName(name)[0]
      if (measure) {
        this.metrics.set(name, measure.duration)
      }
    }
  }

  // Get Core Web Vitals
  getCoreWebVitals() {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve({})
        return
      }

      import('web-vitals').then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
        const vitals: Record<string, number> = {}

        onCLS((metric) => {
          vitals.CLS = metric.value
        })

        onFCP((metric) => {
          vitals.FCP = metric.value
        })

        onINP((metric) => {
          vitals.INP = metric.value
        })

        onLCP((metric) => {
          vitals.LCP = metric.value
        })

        onTTFB((metric) => {
          vitals.TTFB = metric.value
        })

        // Wait a bit for metrics to be collected
        setTimeout(() => resolve(vitals), 1000)
      }).catch(() => resolve({}))
    })
  }

  // Report performance metrics
  reportMetrics() {
    return {
      customMetrics: Object.fromEntries(this.metrics),
      navigation: typeof window !== 'undefined' 
        ? window.performance?.getEntriesByType('navigation')[0] 
        : null,
      resources: typeof window !== 'undefined' 
        ? window.performance?.getEntriesByType('resource').slice(0, 10) 
        : null
    }
  }
}

// Lazy loading utility for heavy components
export function createLazyComponent<T extends Record<string, any> = Record<string, any>>(
  importFunction: () => Promise<{ default: ComponentType<T> }>,
  fallback?: ComponentType
) {
  const LazyComponent = import('react').then(({ lazy, Suspense }) => {
    const Component = lazy(importFunction)
    
    return function LazyWrapper(props: T) {
      const FallbackComponent = fallback || (() => (
        <div className="animate-pulse bg-gray-200 rounded h-32 w-full" />
      ))

      return (
        <Suspense fallback={<FallbackComponent />}>
          <Component {...(props as any)} />
        </Suspense>
      )
    }
  })

  return LazyComponent
}

// Bundle analyzer utility
export function logBundleInfo() {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    console.group('Bundle Information')
    console.log('Current route:', window.location.pathname)
    console.log('Performance metrics:', PerformanceMonitor.getInstance().reportMetrics())
    console.groupEnd()
  }
}

// Resource hints for critical assets
export function addResourceHints(resources: {
  preload?: string[]
  prefetch?: string[]
  preconnect?: string[]
}) {
  if (typeof document === 'undefined') return

  const head = document.head

  // Add preload hints
  resources.preload?.forEach(url => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = url
    link.as = url.endsWith('.css') ? 'style' : 'script'
    head.appendChild(link)
  })

  // Add prefetch hints
  resources.prefetch?.forEach(url => {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = url
    head.appendChild(link)
  })

  // Add preconnect hints
  resources.preconnect?.forEach(url => {
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = url
    head.appendChild(link)
  })
}

// Service Worker registration
export function registerServiceWorker() {
  if (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    process.env.NODE_ENV === 'production'
  ) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registered: ', registration)
        })
        .catch(registrationError => {
          console.log('SW registration failed: ', registrationError)
        })
    })
  }
}

// Memory usage monitoring
export function monitorMemoryUsage() {
  if (typeof window !== 'undefined' && 'memory' in window.performance) {
    const memory = (window.performance as any).memory
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2)
    }
  }
  return null
}