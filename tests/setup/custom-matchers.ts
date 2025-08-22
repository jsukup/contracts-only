import { expect } from '@jest/globals'

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidJobData(): R
      toBeValidUserData(): R
      toHaveValidApiResponse(): R
      toBeAccessible(): R
      toHaveNoConsoleErrors(): R
      toMatchSupabaseSchema(schema: any): R
      toHaveValidPagination(): R
      toBeWithinPerformanceBudget(maxTime: number): R
    }
  }
}

// Custom matcher for job data validation
expect.extend({
  toBeValidJobData(received) {
    const required = ['id', 'title', 'company', 'location', 'isActive']
    const missing = required.filter(field => !(field in received))
    
    if (missing.length > 0) {
      return {
        message: () => `Job data is missing required fields: ${missing.join(', ')}`,
        pass: false,
      }
    }

    // Validate data types
    const validations = [
      { field: 'title', type: 'string', required: true },
      { field: 'company', type: 'string', required: true },
      { field: 'hourlyRateMin', type: 'number', required: false },
      { field: 'hourlyRateMax', type: 'number', required: false },
      { field: 'isActive', type: 'boolean', required: true },
    ]

    for (const validation of validations) {
      const value = received[validation.field]
      if (validation.required && value == null) {
        return {
          message: () => `Job data missing required field: ${validation.field}`,
          pass: false,
        }
      }
      if (value != null && typeof value !== validation.type) {
        return {
          message: () => `Job data field '${validation.field}' should be ${validation.type}, got ${typeof value}`,
          pass: false,
        }
      }
    }

    return {
      message: () => 'Job data is valid',
      pass: true,
    }
  },

  toBeValidUserData(received) {
    const required = ['id', 'email']
    const missing = required.filter(field => !(field in received))
    
    if (missing.length > 0) {
      return {
        message: () => `User data is missing required fields: ${missing.join(', ')}`,
        pass: false,
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(received.email)) {
      return {
        message: () => `User email is invalid: ${received.email}`,
        pass: false,
      }
    }

    return {
      message: () => 'User data is valid',
      pass: true,
    }
  },

  toHaveValidApiResponse(received) {
    if (!received || typeof received !== 'object') {
      return {
        message: () => 'API response should be an object',
        pass: false,
      }
    }

    // Check for error response structure
    if ('error' in received) {
      if (typeof received.error !== 'string') {
        return {
          message: () => 'API error response should have string error message',
          pass: false,
        }
      }
    }

    // Check for success response structure
    if ('data' in received || 'jobs' in received || 'users' in received) {
      return {
        message: () => 'API response has valid structure',
        pass: true,
      }
    }

    return {
      message: () => 'API response should have data, jobs, users, or error field',
      pass: false,
    }
  },

  toBeAccessible(received) {
    // Basic accessibility checks
    const element = received.container || received
    
    // Check for required attributes
    const buttons = element.querySelectorAll('button')
    const invalidButtons = Array.from(buttons).filter((button: Element) => {
      return !button.getAttribute('aria-label') && !button.textContent?.trim()
    })

    if (invalidButtons.length > 0) {
      return {
        message: () => `Found ${invalidButtons.length} buttons without accessible labels`,
        pass: false,
      }
    }

    // Check for images without alt text
    const images = element.querySelectorAll('img')
    const invalidImages = Array.from(images).filter((img: Element) => {
      return !img.getAttribute('alt')
    })

    if (invalidImages.length > 0) {
      return {
        message: () => `Found ${invalidImages.length} images without alt text`,
        pass: false,
      }
    }

    return {
      message: () => 'Element passes basic accessibility checks',
      pass: true,
    }
  },

  toHaveNoConsoleErrors(received) {
    const errors = received.filter((log: any) => log.type === 'error')
    
    if (errors.length > 0) {
      return {
        message: () => `Found ${errors.length} console errors: ${errors.map((e: any) => e.message).join(', ')}`,
        pass: false,
      }
    }

    return {
      message: () => 'No console errors found',
      pass: true,
    }
  },

  toMatchSupabaseSchema(received, schema) {
    const errors: string[] = []
    
    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in received)) {
          errors.push(`Missing required field: ${field}`)
        }
      }
    }

    // Check field types
    if (schema.properties) {
      for (const [field, definition] of Object.entries(schema.properties)) {
        if (field in received) {
          const value = received[field]
          const expectedType = (definition as any).type
          
          if (expectedType === 'string' && typeof value !== 'string') {
            errors.push(`Field '${field}' should be string, got ${typeof value}`)
          } else if (expectedType === 'number' && typeof value !== 'number') {
            errors.push(`Field '${field}' should be number, got ${typeof value}`)
          } else if (expectedType === 'boolean' && typeof value !== 'boolean') {
            errors.push(`Field '${field}' should be boolean, got ${typeof value}`)
          }
        }
      }
    }

    if (errors.length > 0) {
      return {
        message: () => `Schema validation failed: ${errors.join(', ')}`,
        pass: false,
      }
    }

    return {
      message: () => 'Data matches Supabase schema',
      pass: true,
    }
  },

  toHaveValidPagination(received) {
    const required = ['page', 'limit', 'total']
    const missing = required.filter(field => !(field in received))
    
    if (missing.length > 0) {
      return {
        message: () => `Pagination missing fields: ${missing.join(', ')}`,
        pass: false,
      }
    }

    if (typeof received.page !== 'number' || received.page < 1) {
      return {
        message: () => 'Pagination page should be a positive number',
        pass: false,
      }
    }

    if (typeof received.limit !== 'number' || received.limit < 1) {
      return {
        message: () => 'Pagination limit should be a positive number',
        pass: false,
      }
    }

    if (typeof received.total !== 'number' || received.total < 0) {
      return {
        message: () => 'Pagination total should be a non-negative number',
        pass: false,
      }
    }

    return {
      message: () => 'Pagination data is valid',
      pass: true,
    }
  },

  toBeWithinPerformanceBudget(received, maxTime) {
    const duration = typeof received === 'number' ? received : received.duration
    
    if (duration > maxTime) {
      return {
        message: () => `Performance budget exceeded: ${duration}ms > ${maxTime}ms`,
        pass: false,
      }
    }

    return {
      message: () => `Performance within budget: ${duration}ms <= ${maxTime}ms`,
      pass: true,
    }
  },
})

export {}