import { cn, formatCurrency, formatDate, validateEmail, slugify } from '../utils'

describe('utils', () => {
  describe('cn', () => {
    it('should combine class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2')
    })

    it('should handle conditional classes', () => {
      expect(cn('base', true && 'conditional', false && 'hidden')).toBe('base conditional')
    })

    it('should merge Tailwind classes correctly', () => {
      expect(cn('px-4', 'px-2')).toBe('px-2') // Later class should override
    })

    it('should handle undefined and null values', () => {
      expect(cn('base', undefined, null, 'end')).toBe('base end')
    })
  })

  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(100)).toBe('$100')
      expect(formatCurrency(1000)).toBe('$1,000')
      expect(formatCurrency(1000.50)).toBe('$1,001') // Rounds to nearest integer
    })

    it('should handle zero and negative values', () => {
      expect(formatCurrency(0)).toBe('$0')
      expect(formatCurrency(-100)).toBe('-$100')
    })
  })

  describe('formatDate', () => {
    const testDate = new Date('2024-01-15T10:30:00Z')

    it('should format date as short by default', () => {
      const result = formatDate(testDate)
      expect(result).toMatch(/Jan 15, 2024|1\/15\/2024/) // Different locales
    })

    it('should format date as long when requested', () => {
      const result = formatDate(testDate, 'long')
      expect(result).toMatch(/January 15, 2024/)
    })

    it('should format relative dates', () => {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      
      const result = formatDate(yesterday, 'relative')
      expect(result).toMatch(/yesterday|1 day ago/i)
    })

    it('should handle string dates', () => {
      const result = formatDate('2024-01-15', 'short')
      expect(result).toMatch(/Jan 15, 2024|1\/15\/2024/)
    })
  })

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name@domain.co.uk')).toBe(true)
      expect(validateEmail('user+tag@example.org')).toBe(true)
    })

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false)
      expect(validateEmail('test@')).toBe(false)
      expect(validateEmail('@domain.com')).toBe(false)
      expect(validateEmail('test..test@example.com')).toBe(false)
      expect(validateEmail('')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(validateEmail('a@b.co')).toBe(true) // Minimal valid email
      expect(validateEmail('test@domain')).toBe(false) // Missing TLD
      expect(validateEmail('test@.com')).toBe(false) // Missing domain
    })
  })

  describe('slugify', () => {
    it('should create URL-friendly slugs', () => {
      expect(slugify('Senior React Developer')).toBe('senior-react-developer')
      expect(slugify('Full-Stack Engineer')).toBe('full-stack-engineer')
    })

    it('should handle special characters', () => {
      expect(slugify('React & Node.js Developer')).toBe('react-node-js-developer')
      expect(slugify('C++ Developer (Remote)')).toBe('c-developer-remote')
    })

    it('should handle multiple spaces and hyphens', () => {
      expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces')
      expect(slugify('Already-has-hyphens')).toBe('already-has-hyphens')
    })

    it('should handle empty and edge cases', () => {
      expect(slugify('')).toBe('')
      expect(slugify('   ')).toBe('')
      expect(slugify('123')).toBe('123')
      expect(slugify('áéíóú')).toBe('aeiou') // Should handle accents
    })
  })
})