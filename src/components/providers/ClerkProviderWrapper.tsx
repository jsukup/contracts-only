'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { dark } from '@clerk/themes'

interface ClerkProviderWrapperProps {
  children: React.ReactNode
}

export function ClerkProviderWrapper({ children }: ClerkProviderWrapperProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Determine the base URL dynamically
  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      // Client-side: use the current window location
      return window.location.origin
    }
    
    // Server-side: use environment variables
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL
    }
    
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`
    }
    
    return 'http://localhost:3000'
  }

  const baseUrl = getBaseUrl()
  
  // Configure sign-in/up URLs with dynamic base
  const signInUrl = '/sign-in'
  const signUpUrl = '/sign-up'
  const fallbackRedirectUrl = '/dashboard'
  const afterSignUpUrl = '/onboarding'

  return (
    <ClerkProvider
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: '#3b82f6',
          colorText: '#1f2937',
          colorBackground: '#ffffff',
          colorInputBackground: '#ffffff',
          colorInputText: '#1f2937',
          fontFamily: 'var(--font-geist-sans)',
        },
        elements: {
          formButtonPrimary: 
            'bg-blue-600 hover:bg-blue-700 text-white',
          card: 'bg-white shadow-lg',
          headerTitle: 'text-gray-900',
          headerSubtitle: 'text-gray-600',
          socialButtonsBlockButton: 
            'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
          formFieldInput: 
            'border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500',
          footerActionLink: 'text-blue-600 hover:text-blue-500',
        }
      }}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
      signInFallbackRedirectUrl={fallbackRedirectUrl}
      signUpFallbackRedirectUrl={afterSignUpUrl}
    >
      {children}
    </ClerkProvider>
  )
}