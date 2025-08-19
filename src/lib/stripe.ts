// Stripe integration with feature flag support
// This allows easy enabling/disabling of payment features

import { loadStripe, Stripe } from '@stripe/stripe-js'

// Feature flag check
export const isPaymentsEnabled = (): boolean => {
  return process.env.NEXT_PUBLIC_ENABLE_PAYMENTS === 'true'
}

// Stripe configuration
const stripePromise: Promise<Stripe | null> = isPaymentsEnabled() 
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  : Promise.resolve(null)

export const getStripe = () => stripePromise

// Payment types
export interface PaymentPlan {
  id: string
  name: string
  description: string
  price: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  popular?: boolean
}

// Pricing plans for ContractsOnly
export const PRICING_PLANS: PaymentPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'Perfect for individual contractors',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: [
      'Browse unlimited jobs',
      'Apply to 5 jobs per month',
      'Basic profile',
      'Email notifications'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For active contractors and small agencies',
    price: 19,
    currency: 'USD',
    interval: 'month',
    features: [
      'Everything in Basic',
      'Unlimited job applications',
      'Advanced profile with portfolio',
      'Priority support',
      'Advanced search filters',
      'Application tracking'
    ],
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For agencies and teams',
    price: 49,
    currency: 'USD',
    interval: 'month',
    features: [
      'Everything in Pro',
      'Team management',
      'White-label profiles',
      'API access',
      'Custom integrations',
      'Dedicated support'
    ]
  }
]

// Job posting pricing
export const JOB_POSTING_PRICE = {
  singleJob: 49,
  jobPack5: 199,  // $39.8 per job
  jobPack10: 349, // $34.9 per job
  unlimited30Days: 499
}

// Payment session creation
export interface CreatePaymentSessionParams {
  planId: string
  userId: string
  successUrl: string
  cancelUrl: string
  customerId?: string
}

export async function createPaymentSession(params: CreatePaymentSessionParams) {
  if (!isPaymentsEnabled()) {
    throw new Error('Payments are not enabled')
  }

  const response = await fetch('/api/payments/create-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error('Failed to create payment session')
  }

  return response.json()
}

// Job posting payment
export interface CreateJobPostingPaymentParams {
  packageType: 'single' | 'pack5' | 'pack10' | 'unlimited30'
  userId: string
  successUrl: string
  cancelUrl: string
}

export async function createJobPostingPayment(params: CreateJobPostingPaymentParams) {
  if (!isPaymentsEnabled()) {
    throw new Error('Payments are not enabled')
  }

  const response = await fetch('/api/payments/job-posting', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error('Failed to create job posting payment')
  }

  return response.json()
}

// Customer portal access
export async function createCustomerPortalSession(customerId: string, returnUrl: string) {
  if (!isPaymentsEnabled()) {
    throw new Error('Payments are not enabled')
  }

  const response = await fetch('/api/payments/customer-portal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ customerId, returnUrl }),
  })

  if (!response.ok) {
    throw new Error('Failed to create customer portal session')
  }

  return response.json()
}

// Utility functions
export function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

export function getPlanById(planId: string): PaymentPlan | undefined {
  return PRICING_PLANS.find(plan => plan.id === planId)
}

export function getJobPostingPrice(packageType: string): number {
  switch (packageType) {
    case 'single':
      return JOB_POSTING_PRICE.singleJob
    case 'pack5':
      return JOB_POSTING_PRICE.jobPack5
    case 'pack10':
      return JOB_POSTING_PRICE.jobPack10
    case 'unlimited30':
      return JOB_POSTING_PRICE.unlimited30Days
    default:
      return JOB_POSTING_PRICE.singleJob
  }
}

// Feature access control
export function canAccessFeature(userPlan: string, feature: string): boolean {
  if (!isPaymentsEnabled()) {
    return true // All features available when payments disabled
  }

  const planFeatures: Record<string, string[]> = {
    basic: ['browse_jobs', 'apply_5_jobs', 'basic_profile', 'email_notifications'],
    pro: [
      'browse_jobs', 'unlimited_applications', 'advanced_profile', 
      'priority_support', 'advanced_search', 'application_tracking'
    ],
    enterprise: [
      'browse_jobs', 'unlimited_applications', 'advanced_profile',
      'priority_support', 'advanced_search', 'application_tracking',
      'team_management', 'white_label', 'api_access', 'dedicated_support'
    ]
  }

  return planFeatures[userPlan]?.includes(feature) || false
}

// Mock payment flow for development
export async function mockPaymentSuccess(planId: string, userId: string) {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Mock payments only available in development')
  }

  const response = await fetch('/api/payments/mock-success', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ planId, userId }),
  })

  return response.json()
}