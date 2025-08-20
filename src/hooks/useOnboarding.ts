'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface OnboardingState {
  hasCompletedOnboarding: boolean
  hasSeenModal: boolean
  userRole: 'contractor' | 'employer' | null
  shouldShowModal: boolean
  shouldShowTips: boolean
}

export function useOnboarding() {
  const { data: session, status } = useSession()
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    hasCompletedOnboarding: false,
    hasSeenModal: false,
    userRole: null,
    shouldShowModal: false,
    shouldShowTips: true
  })

  useEffect(() => {
    // Only run after session is loaded
    if (status === 'loading') return

    const checkOnboardingStatus = () => {
      const completedOnboarding = localStorage.getItem('onboarding_completed') === 'true'
      const seenModal = localStorage.getItem('onboarding_shown') === 'true'
      const storedRole = localStorage.getItem('user_role') as 'contractor' | 'employer' | null
      const dismissedAllTips = localStorage.getItem('tips_dismissed_all') === 'true'

      // Show modal if user is logged in, hasn't seen it, and hasn't completed onboarding
      const shouldShow = session && !seenModal && !completedOnboarding

      setOnboardingState({
        hasCompletedOnboarding: completedOnboarding,
        hasSeenModal: seenModal,
        userRole: storedRole,
        shouldShowModal: Boolean(shouldShow),
        shouldShowTips: session && completedOnboarding && !dismissedAllTips
      })
    }

    checkOnboardingStatus()
  }, [session, status])

  const completeOnboarding = (role?: 'contractor' | 'employer') => {
    localStorage.setItem('onboarding_completed', 'true')
    localStorage.setItem('onboarding_shown', 'true')
    
    if (role) {
      localStorage.setItem('user_role', role)
    }

    setOnboardingState(prev => ({
      ...prev,
      hasCompletedOnboarding: true,
      hasSeenModal: true,
      userRole: role || prev.userRole,
      shouldShowModal: false,
      shouldShowTips: true
    }))
  }

  const dismissModal = () => {
    localStorage.setItem('onboarding_shown', 'true')
    
    setOnboardingState(prev => ({
      ...prev,
      hasSeenModal: true,
      shouldShowModal: false
    }))
  }

  const setUserRole = (role: 'contractor' | 'employer') => {
    localStorage.setItem('user_role', role)
    
    setOnboardingState(prev => ({
      ...prev,
      userRole: role
    }))
  }

  const resetOnboarding = () => {
    localStorage.removeItem('onboarding_completed')
    localStorage.removeItem('onboarding_shown')
    localStorage.removeItem('user_role')
    localStorage.removeItem('tips_dismissed_all')
    localStorage.removeItem('dismissed_tips')

    setOnboardingState({
      hasCompletedOnboarding: false,
      hasSeenModal: false,
      userRole: null,
      shouldShowModal: Boolean(session),
      shouldShowTips: false
    })
  }

  return {
    ...onboardingState,
    completeOnboarding,
    dismissModal,
    setUserRole,
    resetOnboarding,
    isNewUser: session && !onboardingState.hasSeenModal
  }
}

// Helper function to determine user journey stage
export function getUserJourneyStage(
  hasCompletedOnboarding: boolean,
  userRole: 'contractor' | 'employer' | null,
  hasProfile?: boolean
): 'new' | 'onboarding' | 'setup' | 'active' {
  if (!hasCompletedOnboarding) {
    return 'new'
  }
  
  if (!userRole) {
    return 'onboarding'
  }

  if (!hasProfile) {
    return 'setup'
  }

  return 'active'
}

// Hook to track onboarding analytics
export function useOnboardingAnalytics() {
  const trackEvent = (event: string, properties?: Record<string, any>) => {
    // In production, this would send to your analytics service
    console.log('Onboarding Event:', event, properties)
    
    // Example analytics events:
    // - onboarding_started
    // - role_selected
    // - onboarding_completed
    // - onboarding_skipped
    // - profile_completed
    // - first_job_viewed (contractor)
    // - first_job_posted (employer)
  }

  return { trackEvent }
}