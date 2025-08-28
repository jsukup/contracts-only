import React from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { ClerkProvider } from '@clerk/nextjs'
import userEvent from '@testing-library/user-event'

// Re-export everything from testing library
export * from '@testing-library/react'
export { userEvent }

// Create test wrapper component
export const createTestWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <div data-testid="test-wrapper">
      {children}
    </div>
  )
}

// Mock Clerk user for testing
const createMockClerkUser = (overrides: any = {}) => ({
  id: 'test-user-id',
  primaryEmailAddress: { emailAddress: 'test@example.com' },
  fullName: 'Test User',
  firstName: 'Test',
  lastName: 'User',
  publicMetadata: { role: 'USER' },
  update: jest.fn().mockResolvedValue({}),
  ...overrides,
})

// Custom render function with Clerk provider
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: any
  clerkState?: any
  wrapper?: React.ComponentType<any>
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    user = createMockClerkUser(),
    clerkState = {},
    wrapper,
    ...renderOptions
  }: CustomRenderOptions = {}
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const WrapperComponent = wrapper || React.Fragment
    
    return (
      <WrapperComponent>
        <ClerkProvider publishableKey="pk_test_mock">
          {children}
        </ClerkProvider>
      </WrapperComponent>
    )
  }

  const userEventInstance = userEvent.setup()

  return {
    user: userEventInstance,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}

// Mock data factories
export const createMockJob = (overrides: Partial<any> = {}) => ({
  id: 'job-1',
  title: 'Senior React Developer',
  company: 'Tech Corp',
  location: 'Remote',
  isRemote: true,
  jobType: 'CONTRACT',
  hourlyRateMin: 80,
  hourlyRateMax: 120,
  currency: 'USD',
  contractDuration: '6 months',
  hoursPerWeek: 40,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  expiresAt: '2024-12-31T00:00:00.000Z',
  isActive: true,
  postedBy: {
    id: 'user-1',
    name: 'Tech Corp HR',
    email: 'hr@techcorp.com'
  },
  jobSkills: [
    { skill: { id: 'skill-1', name: 'React' } },
    { skill: { id: 'skill-2', name: 'TypeScript' } }
  ],
  _count: {
    applications: 5
  },
  ...overrides,
})

export const createMockUser = (overrides: Partial<any> = {}) => ({
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'USER',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  profile: {
    bio: 'Software Developer',
    location: 'San Francisco',
    skills: ['React', 'TypeScript', 'Node.js'],
  },
  ...overrides,
})

export const createMockApplication = (overrides: Partial<any> = {}) => ({
  id: 'app-1',
  jobId: 'job-1',
  userId: 'user-1',
  status: 'PENDING',
  coverLetter: 'I am interested in this position...',
  resume: 'https://example.com/resume.pdf',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

// Supabase mock helpers
export const createMockSupabaseQuery = (data: any = [], error: any = null) => ({
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  like: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  is: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: data[0] || null, error }),
  maybeSingle: jest.fn().mockResolvedValue({ data: data[0] || null, error }),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  then: jest.fn().mockResolvedValue({ data, error }),
})

// API testing helpers
export const createMockRequest = (url: string, options: any = {}) => {
  return new Request(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
}

export const createMockResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Performance testing helpers
export const measurePerformance = async (fn: () => Promise<any> | any) => {
  const start = performance.now()
  await fn()
  const end = performance.now()
  return end - start
}

// Accessibility testing helpers
export const checkAccessibility = (container: HTMLElement) => {
  const violations = []
  
  // Check for missing alt text on images
  const images = container.querySelectorAll('img')
  images.forEach((img, index) => {
    if (!img.getAttribute('alt')) {
      violations.push(`Image ${index + 1} missing alt attribute`)
    }
  })
  
  // Check for buttons without accessible names
  const buttons = container.querySelectorAll('button')
  buttons.forEach((button, index) => {
    const hasLabel = button.getAttribute('aria-label') || button.textContent?.trim()
    if (!hasLabel) {
      violations.push(`Button ${index + 1} missing accessible name`)
    }
  })
  
  // Check for form inputs without labels
  const inputs = container.querySelectorAll('input')
  inputs.forEach((input, index) => {
    const hasLabel = input.getAttribute('aria-label') || 
                    input.getAttribute('aria-labelledby') ||
                    container.querySelector(`label[for="${input.id}"]`)
    if (!hasLabel) {
      violations.push(`Input ${index + 1} missing label`)
    }
  })
  
  return violations
}

// Console error tracking
export const trackConsoleErrors = () => {
  const errors: any[] = []
  const originalError = console.error
  
  console.error = (...args) => {
    errors.push({ type: 'error', message: args.join(' '), timestamp: Date.now() })
    originalError.apply(console, args)
  }
  
  return {
    getErrors: () => errors,
    restore: () => {
      console.error = originalError
    },
  }
}

// Wait for async operations
export const waitForAsyncOperations = () => {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// Snapshot helpers
export const createComponentSnapshot = (component: React.ReactElement, props: any = {}) => {
  const { container } = render(component)
  return container.firstChild
}

// Mock localStorage for testing
export const createMockLocalStorage = () => {
  const store: { [key: string]: string } = {}
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      Object.keys(store).forEach(key => delete store[key])
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => Object.keys(store)[index] || null,
  }
}

// Environment setup helpers
export const setupTestEnvironment = () => {
  // Setup mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: createMockLocalStorage(),
  })
  
  // Setup mock sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: createMockLocalStorage(),
  })
  
  // Setup mock fetch
  global.fetch = jest.fn()
  
  // Setup mock window.location
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      pathname: '/',
      search: '',
      hash: '',
    },
    writable: true,
  })
}

// Cleanup helpers
export const cleanupTestEnvironment = () => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
}