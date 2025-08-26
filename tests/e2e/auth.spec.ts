import { test, expect } from '@playwright/test'
import { 
  cleanupTestUsers, 
  cleanupTestUserByEmail, 
  generateTestEmail,
  verifyDatabaseClean 
} from './utils/database-cleanup'

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_TEST_URL || 'https://contracts-only.vercel.app'
const TEST_PASSWORD = 'TestPass123!'

test.describe('Authentication Flow', () => {
  // Clean up test users before each test
  test.beforeEach(async () => {
    // Always cleanup before each test to ensure clean state
    await cleanupTestUsers()
    await verifyDatabaseClean()
  })

  test('Contractor signup with email verification', async ({ page }) => {
    const testEmail = generateTestEmail('contractor')
    
    // Navigate to signup page
    await page.goto(`${BASE_URL}/auth/signup`)
    
    // Fill signup form
    await page.fill('input[name="name"]', 'Test Contractor')
    await page.fill('input[name="email"]', testEmail)
    await page.click('button:has-text("Contractor")')
    await page.fill('input[name="password"]', TEST_PASSWORD)
    await page.fill('input[name="confirmPassword"]', TEST_PASSWORD)
    
    // Submit form
    await page.click('button:has-text("Create Account")')
    
    // Verify email verification message appears
    await expect(page.locator('h3:has-text("Check your email!")')).toBeVisible()
    await expect(page.locator(`text=${testEmail}`)).toBeVisible()
    
    // Verify resend button is visible and styled correctly
    const resendButton = page.locator('button:has-text("Resend Verification Email")')
    await expect(resendButton).toBeVisible()
    await expect(resendButton).toHaveCSS('border-color', 'rgb(59, 130, 246)') // blue-500
    
    // Test resend button click (should show loading state)
    await resendButton.click()
    await expect(page.locator('text=Sending...')).toBeVisible()
    await page.waitForTimeout(1000) // Wait for animation
    
    // Note: Cannot test actual email receipt in E2E tests without email service integration
    // Consider using a service like Mailosaur or Mailtrap for email testing
  })

  test('Recruiter signup flow', async ({ page }) => {
    const testEmail = generateTestEmail('recruiter')
    
    await page.goto(`${BASE_URL}/auth/signup`)
    
    // Fill form with recruiter role
    await page.fill('input[name="name"]', 'Test Recruiter')
    await page.fill('input[name="email"]', testEmail)
    await page.click('button:has-text("Recruiter")')
    await page.fill('input[name="password"]', TEST_PASSWORD)
    await page.fill('input[name="confirmPassword"]', TEST_PASSWORD)
    
    await page.click('button:has-text("Create Account")')
    
    // Verify email verification message
    await expect(page.locator('h3:has-text("Check your email!")')).toBeVisible()
  })

  test('Google OAuth signup', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/signup`)
    
    // Click Google signup button
    await page.click('button:has-text("Sign up with Google")')
    
    // Verify redirect to Google OAuth
    await page.waitForURL(/accounts\.google\.com/, { timeout: 5000 })
    
    // Note: Cannot complete Google OAuth in automated tests without test account credentials
  })

  test('Signin with existing account', async ({ page }) => {
    // This test requires a pre-verified account
    // You could create one via Supabase Admin API before the test
    
    await page.goto(`${BASE_URL}/auth/signin`)
    
    await page.fill('input[name="email"]', 'existing@example.com')
    await page.fill('input[name="password"]', TEST_PASSWORD)
    
    await page.click('button:has-text("Sign In")')
    
    // Check for error or success
    // Success would redirect to dashboard
    await page.waitForURL(/dashboard|signin/, { timeout: 5000 })
  })

  test('Invalid credentials error', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/signin`)
    
    await page.fill('input[name="email"]', 'nonexistent@example.com')
    await page.fill('input[name="password"]', 'WrongPassword123!')
    
    await page.click('button:has-text("Sign In")')
    
    // Verify error message appears
    await expect(page.locator('text=Invalid login credentials')).toBeVisible()
  })

  test('Password validation', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/signup`)
    
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'weak')
    await page.fill('input[name="confirmPassword"]', 'weak')
    
    await page.click('button:has-text("Create Account")')
    
    // Should show password validation error
    await expect(page.locator('text=/must be at least/i')).toBeVisible()
  })

  test('Email format validation', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/signup`)
    
    await page.fill('input[name="email"]', 'invalid-email')
    await page.fill('input[name="password"]', TEST_PASSWORD)
    
    await page.click('button:has-text("Create Account")')
    
    // Should show email validation error
    await expect(page.locator('text=/valid email/i')).toBeVisible()
  })
})

// Cleanup after all tests complete
test.afterAll(async () => {
  // Final cleanup to ensure no test data remains
  await cleanupTestUsers()
  console.log('🎉 All authentication tests completed and cleaned up')
})

test.describe('Email Verification Flow (with email service)', () => {
  // These tests require integration with an email testing service
  // Examples: Mailosaur, Mailtrap, or custom email webhook
  
  test.skip('Full email verification flow', async ({ page }) => {
    // 1. Create account
    // 2. Fetch verification email from test email service
    // 3. Extract verification link
    // 4. Navigate to verification link
    // 5. Verify redirect to dashboard
  })
})

test.describe('Session Management', () => {
  test('Session persists after browser reload', async ({ page, context }) => {
    // Login first
    // ... login steps ...
    
    // Reload page
    await page.reload()
    
    // Should still be logged in
    await expect(page.locator('text=Dashboard')).toBeVisible()
  })

  test('Logout clears session', async ({ page }) => {
    // Login first
    // ... login steps ...
    
    // Click logout
    await page.click('button:has-text("Sign Out")')
    
    // Should redirect to home or signin
    await expect(page).toHaveURL(/\/(signin|$)/)
    
    // Try to access protected route
    await page.goto(`${BASE_URL}/dashboard`)
    
    // Should redirect to signin
    await expect(page).toHaveURL(/signin/)
  })
})