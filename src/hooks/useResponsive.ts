'use client'

import { useState, useEffect } from 'react'

export interface BreakpointConfig {
  sm: number   // 640px
  md: number   // 768px
  lg: number   // 1024px
  xl: number   // 1280px
  '2xl': number // 1536px
}

const defaultBreakpoints: BreakpointConfig = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
}

export type Breakpoint = keyof BreakpointConfig

export function useResponsive(breakpoints: BreakpointConfig = defaultBreakpoints) {
  const [windowSize, setWindowSize] = useState<{
    width: number
    height: number
  }>({
    width: 0,
    height: 0
  })

  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('sm')

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth
      const height = window.innerHeight
      
      setWindowSize({ width, height })

      // Determine current breakpoint
      if (width >= breakpoints['2xl']) {
        setCurrentBreakpoint('2xl')
      } else if (width >= breakpoints.xl) {
        setCurrentBreakpoint('xl')
      } else if (width >= breakpoints.lg) {
        setCurrentBreakpoint('lg')
      } else if (width >= breakpoints.md) {
        setCurrentBreakpoint('md')
      } else {
        setCurrentBreakpoint('sm')
      }
    }

    // Set initial size
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [breakpoints])

  // Helper functions
  const isMobile = windowSize.width < breakpoints.md
  const isTablet = windowSize.width >= breakpoints.md && windowSize.width < breakpoints.lg
  const isDesktop = windowSize.width >= breakpoints.lg
  const isLargeDesktop = windowSize.width >= breakpoints.xl

  // Breakpoint checkers
  const isBreakpoint = (bp: Breakpoint) => currentBreakpoint === bp
  const isAboveBreakpoint = (bp: Breakpoint) => windowSize.width >= breakpoints[bp]
  const isBelowBreakpoint = (bp: Breakpoint) => windowSize.width < breakpoints[bp]

  // Device orientation
  const isLandscape = windowSize.width > windowSize.height
  const isPortrait = windowSize.height > windowSize.width

  return {
    windowSize,
    currentBreakpoint,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isBreakpoint,
    isAboveBreakpoint,
    isBelowBreakpoint,
    isLandscape,
    isPortrait,
    // Commonly used breakpoint checks
    sm: isAboveBreakpoint('sm'),
    md: isAboveBreakpoint('md'),
    lg: isAboveBreakpoint('lg'),
    xl: isAboveBreakpoint('xl'),
    '2xl': isAboveBreakpoint('2xl')
  }
}

// Hook for media queries
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [query])

  return matches
}

// Predefined media query hooks
export function useMobileView() {
  return useMediaQuery('(max-width: 767px)')
}

export function useTabletView() {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
}

export function useDesktopView() {
  return useMediaQuery('(min-width: 1024px)')
}

// Hook for touch device detection
export function useTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    setIsTouchDevice(hasTouch)
  }, [])

  return isTouchDevice
}

// Hook for device pixel ratio (for high-DPI displays)
export function useDevicePixelRatio() {
  const [devicePixelRatio, setDevicePixelRatio] = useState(1)

  useEffect(() => {
    const updateDevicePixelRatio = () => {
      setDevicePixelRatio(window.devicePixelRatio || 1)
    }

    updateDevicePixelRatio()

    window.addEventListener('resize', updateDevicePixelRatio)
    return () => window.removeEventListener('resize', updateDevicePixelRatio)
  }, [])

  return devicePixelRatio
}

// Hook for viewport dimensions (excluding browser UI)
export function useViewportSize() {
  const [viewportSize, setViewportSize] = useState({
    width: 0,
    height: 0
  })

  useEffect(() => {
    const updateViewportSize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    updateViewportSize()

    window.addEventListener('resize', updateViewportSize)
    window.addEventListener('orientationchange', updateViewportSize)

    return () => {
      window.removeEventListener('resize', updateViewportSize)
      window.removeEventListener('orientationchange', updateViewportSize)
    }
  }, [])

  return viewportSize
}

// Hook for safe area insets (for devices with notches)
export function useSafeAreaInsets() {
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  })

  useEffect(() => {
    const updateSafeAreaInsets = () => {
      const style = getComputedStyle(document.documentElement)
      setSafeAreaInsets({
        top: parseInt(style.getPropertyValue('--safe-area-inset-top')) || 0,
        right: parseInt(style.getPropertyValue('--safe-area-inset-right')) || 0,
        bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom')) || 0,
        left: parseInt(style.getPropertyValue('--safe-area-inset-left')) || 0
      })
    }

    updateSafeAreaInsets()

    window.addEventListener('resize', updateSafeAreaInsets)
    window.addEventListener('orientationchange', updateSafeAreaInsets)

    return () => {
      window.removeEventListener('resize', updateSafeAreaInsets)
      window.removeEventListener('orientationchange', updateSafeAreaInsets)
    }
  }, [])

  return safeAreaInsets
}

// Utility function to get responsive value based on breakpoint
export function getResponsiveValue<T>(
  values: Partial<Record<Breakpoint, T>>,
  currentBreakpoint: Breakpoint,
  fallback: T
): T {
  // Order breakpoints from largest to smallest
  const orderedBreakpoints: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm']
  
  // Find the appropriate value for current breakpoint or smaller
  const currentIndex = orderedBreakpoints.indexOf(currentBreakpoint)
  
  for (let i = currentIndex; i < orderedBreakpoints.length; i++) {
    const bp = orderedBreakpoints[i]
    if (values[bp] !== undefined) {
      return values[bp] as T
    }
  }
  
  return fallback
}