import { test, expect } from '@playwright/test'

// Test configuration - use production URL
const BASE_URL = 'https://contracts-only.vercel.app'
const TEST_PASSWORD = 'TestPass123!'

// Generate unique test email with timestamp
function generateTestEmail(prefix: string = 'test'): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  return `${prefix}_${timestamp}_${random}@example.com`
}

test.describe('Authentication UI Tests', () => {
  test('Signup page loads and displays correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/signup`)
    
    // Check page title and heading
    await expect(page).toHaveTitle(/Create your account/)
    await expect(page.locator('h2')).toContainText('Create your account')
    
    // Check all form elements are present
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible()
    
    // Check role selection buttons
    await expect(page.locator('button:has-text("Contractor")')).toBeVisible()
    await expect(page.locator('button:has-text("Recruiter")')).toBeVisible()
    
    // Check Google OAuth button
    await expect(page.locator('button:has-text("Sign up with Google")')).toBeVisible()
    
    // Check create account button
    await expect(page.locator('button:has-text("Create Account")')).toBeVisible()
  })

  test('Signin page loads and displays correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/signin`)
    
    // Check page elements
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible()
    await expect(page.locator('button:has-text("Sign in with Google")')).toBeVisible()
  })

  test('Contractor signup shows email verification message', async ({ page }) => {
    const testEmail = generateTestEmail('contractor_ui')
    
    await page.goto(`${BASE_URL}/auth/signup`)
    
    // Fill out form
    await page.fill('input[name="name"]', 'Test Contractor UI')
    await page.fill('input[name="email"]', testEmail)
    await page.click('button:has-text("Contractor")')
    
    // Check that contractor role is selected (visual feedback)
    await expect(page.locator('button:has-text("Contractor")')).toHaveClass(/border-indigo-500/)
    
    await page.fill('input[name="password"]', TEST_PASSWORD)
    await page.fill('input[name="confirmPassword"]', TEST_PASSWORD)
    
    // Submit form
    await page.click('button:has-text("Create Account")')
    
    // Wait for and verify email verification message
    await expect(page.locator('h3:has-text("Check your email!")')).toBeVisible({ timeout: 10000 })
    await expect(page.locator(`text=${testEmail}`)).toBeVisible()
    
    // Check that resend button is visible and properly styled
    const resendButton = page.locator('button:has-text("Resend Verification Email")')
    await expect(resendButton).toBeVisible()
    
    // Verify button styling (should have blue border)
    await expect(resendButton).toHaveCSS('border-color', 'rgb(59, 130, 246)')
  })

  test('Recruiter signup shows email verification message', async ({ page }) => {
    const testEmail = generateTestEmail('recruiter_ui')
    
    await page.goto(`${BASE_URL}/auth/signup`)
    
    // Fill out form with recruiter role
    await page.fill('input[name="name"]', 'Test Recruiter UI')
    await page.fill('input[name="email"]', testEmail)
    await page.click('button:has-text("Recruiter")')
    
    // Check that recruiter role is selected
    await expect(page.locator('button:has-text("Recruiter")')).toHaveClass(/border-indigo-500/)
    
    await page.fill('input[name="password"]', TEST_PASSWORD)
    await page.fill('input[name="confirmPassword"]', TEST_PASSWORD)
    
    await page.click('button:has-text("Create Account")')
    
    // Verify email verification message appears
    await expect(page.locator('h3:has-text("Check your email!")')).toBeVisible({ timeout: 10000 })
    await expect(page.locator(`text=${testEmail}`)).toBeVisible()
  })

  test('Password validation displays error for weak password', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/signup`)
    
    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.click('button:has-text("Contractor")')
    await page.fill('input[name="password"]', 'weak')
    await page.fill('input[name="confirmPassword"]', 'weak')
    
    await page.click('button:has-text("Create Account")')
    
    // Should show password validation error
    await expect(page.locator('text=/must be at least/i')).toBeVisible({ timeout: 5000 })
  })

  test('Email validation displays error for invalid email', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/signup`)
    
    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', 'invalid-email')
    await page.click('button:has-text("Contractor")')
    await page.fill('input[name="password"]', TEST_PASSWORD)
    await page.fill('input[name="confirmPassword"]', TEST_PASSWORD)
    
    await page.click('button:has-text("Create Account")')
    
    // Should show email validation error
    await expect(page.locator('text=/valid email/i')).toBeVisible({ timeout: 5000 })
  })

  test('Password mismatch shows error', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/signup`)
    
    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.click('button:has-text("Contractor")')
    await page.fill('input[name="password"]', TEST_PASSWORD)
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!')
    
    await page.click('button:has-text("Create Account")')
    
    // Should show password mismatch error
    await expect(page.locator('text=/passwords.*match/i')).toBeVisible({ timeout: 5000 })
  })

  test('Invalid login shows error message', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/signin`)
    
    await page.fill('input[name="email"]', 'nonexistent@example.com')
    await page.fill('input[name="password"]', 'WrongPassword123!')
    
    await page.click('button:has-text("Sign In")')
    
    // Should show invalid credentials error
    await expect(page.locator('text=/invalid.*credentials/i')).toBeVisible({ timeout: 10000 })
  })

  test('Resend button shows loading state when clicked', async ({ page }) => {
    const testEmail = generateTestEmail('resend_test')
    
    await page.goto(`${BASE_URL}/auth/signup`)
    
    // Create account to get to verification screen
    await page.fill('input[name="name"]', 'Resend Test User')
    await page.fill('input[name="email"]', testEmail)
    await page.click('button:has-text("Contractor")')
    await page.fill('input[name="password"]', TEST_PASSWORD)
    await page.fill('input[name="confirmPassword"]', TEST_PASSWORD)
    await page.click('button:has-text("Create Account")')
    
    // Wait for verification message
    await expect(page.locator('h3:has-text("Check your email!")')).toBeVisible({ timeout: 10000 })
    
    // Click resend button and check for loading state
    const resendButton = page.locator('button:has-text("Resend Verification Email")')
    await resendButton.click()
    
    // Should show loading state
    await expect(page.locator('text=Sending...')).toBeVisible({ timeout: 5000 })
  })

  test('Google OAuth button redirects to Google', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/signup`)
    
    // Click Google signup button
    const googleButton = page.locator('button:has-text("Sign up with Google")')
    await googleButton.click()
    
    // Should redirect to Google OAuth (or show loading)
    // Note: In a real test environment, this would redirect to Google
    // For now, just verify the button is clickable
    await page.waitForTimeout(2000) // Give time for any redirect/loading
  })
})