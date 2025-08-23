// Test application setup for integration tests
// Creates a test instance of the Next.js app for API testing

import { NextApiHandler } from 'next'
import { createMocks } from 'node-mocks-http'

// Mock Express-like app for integration testing
export const createTestApp = () => {
  return {
    request: (method: string, url: string, data?: any, headers?: any) => {
      const { req, res } = createMocks({
        method: method.toUpperCase(),
        url,
        body: data,
        headers: {
          'content-type': 'application/json',
          ...headers
        }
      })
      
      return { req, res }
    }
  }
}

// Helper to test Next.js API routes
export const testApiRoute = async (
  handler: NextApiHandler,
  method: string,
  url: string,
  data?: any,
  headers?: any
) => {
  const { req, res } = createMocks({
    method: method.toUpperCase(),
    url,
    body: data,
    headers: {
      'content-type': 'application/json',
      ...headers
    }
  })

  await handler(req, res)
  return res
}

// Mock authentication for tests
export const createAuthenticatedRequest = (userId: string, userType: 'CONTRACTOR' | 'EMPLOYER' = 'EMPLOYER') => {
  return {
    'authorization': `Bearer mock-token-${userId}`,
    'x-user-id': userId,
    'x-user-type': userType
  }
}

// Mock database connection for tests
export const mockDatabase = {
  jobs: [],
  users: [],
  applications: []
}

export default createTestApp