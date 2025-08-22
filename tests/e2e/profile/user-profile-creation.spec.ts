import { test, expect } from '@playwright/test'
import { E2EHelpers, createE2EUserData } from '../e2e-helpers'
import { dbTestHelper } from '../../setup/database-setup'

test.describe('User Profile Creation & Management', () => {
  let helpers: E2EHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new E2EHelpers(page)
  })

  test.describe('Onboarding Flow', () => {
    test('New user completes contractor onboarding workflow', async ({ page }) => {
      test.step('User registration and onboarding initiation', async () => {
        // Register new user
        await helpers.registerNewUser({
          email: 'newcontractor@test.com',
          password: 'SecurePass123!',
          name: 'New Contractor'
        })

        // Verify redirect to onboarding
        await helpers.verifyURL('**/onboarding')
        await helpers.verifyElementExists('[data-testid="onboarding-welcome"]')
        await helpers.verifyTextContent('h2', 'Welcome to ContractsOnly!')

        await helpers.takeScreenshot('onboarding-welcome')
      })

      test.step('Role selection as contractor', async () => {
        // Verify role selection options are displayed
        await helpers.verifyElementExists('[data-testid="role-contractor"]')
        await helpers.verifyElementExists('[data-testid="role-employer"]')

        // Verify contractor role features
        await helpers.verifyTextContent('[data-testid="role-contractor"] h3', "I'm looking for contract work")
        await helpers.verifyElementExists('text=Browse contract jobs with clear hourly rates')
        await helpers.verifyElementExists('text=Apply directly to company applications')

        // Select contractor role
        await page.click('[data-testid="role-contractor"]')

        // Verify role is selected visually
        await expect(page.locator('[data-testid="role-contractor"]')).toHaveClass(/ring-2/)
        
        // Progress to next step
        await page.click('[data-testid="next-button"]')
        
        await helpers.takeScreenshot('contractor-role-selected')
      })

      test.step('How ContractsOnly works explanation', async () => {
        // Verify step content for contractors
        await helpers.verifyTextContent('h2', 'How ContractsOnly Works')
        await helpers.verifyElementExists('text=Browse Jobs')
        await helpers.verifyElementExists('text=Apply Directly')
        await helpers.verifyElementExists('text=Work & Deliver')
        await helpers.verifyElementExists('text=Get Rated')

        // Verify contractor-specific workflow cards
        await helpers.verifyElementExists('text=Search contract opportunities with transparent hourly rates')
        await helpers.verifyElementExists('text=Click "Apply Now" to go directly to the company\'s application process')

        await page.click('[data-testid="next-button"]')

        await helpers.takeScreenshot('contractor-workflow-explanation')
      })

      test.step('Profile setup guidance', async () => {
        // Verify profile setup step
        await helpers.verifyTextContent('h2', 'Complete Your Profile')
        await helpers.verifyElementExists('text=A complete profile helps companies find and trust you')

        // Verify required profile elements
        await helpers.verifyElementExists('text=Professional headline')
        await helpers.verifyElementExists('text=Skills & expertise')
        await helpers.verifyElementExists('text=Hourly rate range')

        // Verify profile tips
        await helpers.verifyElementExists('text=Use a professional headline that clearly states what you do')
        await helpers.verifyElementExists('text=Set competitive but realistic hourly rates')

        // Click to complete profile
        await page.click('[data-testid="complete-profile-button"]')

        // Verify navigation to profile form
        await helpers.verifyURL('**/dashboard/profile')

        await helpers.takeScreenshot('profile-setup-guidance')
      })
    })

    test('New user completes employer onboarding workflow', async ({ page }) => {
      test.step('Employer role selection and workflow', async () => {
        await helpers.registerNewUser({
          email: 'newemployer@test.com',
          password: 'SecurePass123!',
          name: 'New Employer'
        })

        await helpers.verifyURL('**/onboarding')

        // Select employer role
        await page.click('[data-testid="role-employer"]')
        await page.click('[data-testid="next-button"]')

        // Verify employer-specific workflow
        await helpers.verifyElementExists('text=Post Jobs')
        await helpers.verifyElementExists('text=Get Discovered')
        await helpers.verifyElementExists('text=Manage Process')
        await helpers.verifyElementExists('text=Leave Reviews')

        await page.click('[data-testid="next-button"]')

        await helpers.takeScreenshot('employer-workflow')
      })

      test.step('Company setup guidance', async () => {
        // Verify company setup step
        await helpers.verifyTextContent('h2', 'Set Up Company Profile')
        await helpers.verifyElementExists('text=Help contractors learn about your company')

        // Verify company information requirements
        await helpers.verifyElementExists('text=Company name & description')
        await helpers.verifyElementExists('text=Industry & company size')

        // Verify company tips
        await helpers.verifyElementExists('text=Write a clear company description that attracts talent')
        await helpers.verifyElementExists('text=Be clear about remote work policies')

        await page.click('[data-testid="next-button"]')

        await helpers.takeScreenshot('company-setup-guidance')
      })

      test.step('First job posting guidance', async () => {
        // Verify job posting guidance
        await helpers.verifyTextContent('h2', 'Post Your First Job')
        await helpers.verifyElementExists('text=Create a compelling job listing')

        // Verify job posting essentials
        await helpers.verifyElementExists('text=Clear job title and detailed description')
        await helpers.verifyElementExists('text=Transparent hourly rate range')
        await helpers.verifyElementExists('text=Required skills and experience level')

        // Verify best practices
        await helpers.verifyElementExists('text=Be specific about deliverables and expectations')
        await helpers.verifyElementExists('text=Set competitive rates to attract quality talent')

        // Complete onboarding
        await page.click('[data-testid="complete-onboarding-button"]')

        await helpers.takeScreenshot('job-posting-guidance')
      })
    })

    test('Onboarding skip functionality', async ({ page }) => {
      test.step('User can skip onboarding process', async () => {
        await helpers.registerNewUser({
          email: 'skippinguser@test.com',
          password: 'SecurePass123!',
          name: 'Skipping User'
        })

        await helpers.verifyURL('**/onboarding')

        // Click skip button
        await page.click('[data-testid="skip-onboarding-button"]')

        // Verify redirect to dashboard
        await helpers.verifyURL('**/dashboard')
        
        // Verify onboarding completion is stored
        const onboardingCompleted = await page.evaluate(() => 
          localStorage.getItem('onboarding_completed')
        )
        expect(onboardingCompleted).toBe('true')

        await helpers.takeScreenshot('onboarding-skipped')
      })
    })
  })

  test.describe('Profile Form Functionality', () => {
    test('User creates comprehensive contractor profile', async ({ page }) => {
      test.step('Navigate to profile form and verify initial state', async () => {
        await helpers.loginAsContractor()
        await helpers.navigateToProfile()

        // Verify profile form loads
        await helpers.waitForElement('[data-testid="profile-form"]')
        await helpers.verifyElementExists('input[name="name"]')
        await helpers.verifyElementExists('input[name="title"]')
        await helpers.verifyElementExists('textarea[name="bio"]')

        // Verify form is initially empty for new user
        await expect(page.locator('input[name="name"]')).toHaveValue('')
        await expect(page.locator('input[name="title"]')).toHaveValue('')

        await helpers.takeScreenshot('profile-form-initial')
      })

      test.step('Fill basic profile information', async () => {
        // Fill basic information
        await page.fill('input[name="name"]', 'John Professional Contractor')
        await page.fill('input[name="title"]', 'Senior Full-Stack Developer')
        
        const bioText = 'Experienced full-stack developer with 8+ years of expertise in React, Node.js, and cloud technologies. Passionate about creating scalable web applications and delivering high-quality code. Available for short to medium-term contracts.'
        await page.fill('textarea[name="bio"]', bioText)

        // Fill location and contact information
        await page.fill('input[name="location"]', 'San Francisco, CA (Remote)')
        await page.fill('input[name="website"]', 'https://johndev.com')
        await page.fill('input[name="linkedinUrl"]', 'https://linkedin.com/in/johnprofessional')

        // Verify character limit on bio
        await helpers.verifyTextContent('[data-testid="bio-character-count"]', `${bioText.length}/1000`)

        await helpers.takeScreenshot('basic-profile-filled')
      })

      test.step('Set availability and hourly rates', async () => {
        // Set availability status
        await page.selectOption('select[name="availability"]', 'AVAILABLE')
        await expect(page.locator('select[name="availability"]')).toHaveValue('AVAILABLE')

        // Set hourly rate range
        await page.fill('input[name="hourlyRateMin"]', '85')
        await page.fill('input[name="hourlyRateMax"]', '125')

        // Verify rate validation
        await helpers.verifyElementNotExists('[data-testid="rate-validation-error"]')

        await helpers.takeScreenshot('availability-rates-set')
      })

      test.step('Manage skills and expertise', async () => {
        // Verify skills section exists
        await helpers.verifyElementExists('[data-testid="skills-section"]')
        await helpers.verifyElementExists('input[name="newSkill"]')

        // Add new skills
        const skillsToAdd = ['React', 'Node.js', 'TypeScript', 'AWS', 'PostgreSQL']
        
        for (const skill of skillsToAdd) {
          await page.fill('input[name="newSkill"]', skill)
          await page.press('input[name="newSkill"]', 'Enter')
          
          // Verify skill was added
          await helpers.verifyElementExists(`[data-testid="skill-badge-${skill.toLowerCase()}"]`)
          
          // Verify input is cleared
          await expect(page.locator('input[name="newSkill"]')).toHaveValue('')
        }

        // Verify all skills are displayed as selected
        for (const skill of skillsToAdd) {
          const skillBadge = page.locator(`[data-testid="skill-badge-${skill.toLowerCase()}"]`)
          await expect(skillBadge).toHaveClass(/bg-blue-500/) // Selected state
        }

        await helpers.takeScreenshot('skills-added')
      })

      test.step('Test skill management interactions', async () => {
        // Test removing a skill
        await page.click('[data-testid="skill-badge-aws"]')
        
        // Verify skill is deselected
        const awsSkillBadge = page.locator('[data-testid="skill-badge-aws"]')
        await expect(awsSkillBadge).toHaveClass(/border-gray-300/) // Deselected state

        // Re-select the skill
        await page.click('[data-testid="skill-badge-aws"]')
        await expect(awsSkillBadge).toHaveClass(/bg-blue-500/) // Selected again

        // Test adding skill with button instead of Enter
        await page.fill('input[name="newSkill"]', 'Docker')
        await page.click('[data-testid="add-skill-button"]')
        
        await helpers.verifyElementExists('[data-testid="skill-badge-docker"]')

        await helpers.takeScreenshot('skill-interactions')
      })

      test.step('Save profile and verify success', async () => {
        // Save the profile
        await page.click('[data-testid="save-profile-button"]')

        // Verify loading state
        await helpers.verifyElementExists('[data-testid="saving-indicator"]')
        await helpers.verifyTextContent('[data-testid="save-profile-button"]', 'Saving...')

        // Wait for success notification
        await helpers.waitForElement('[data-testid="save-success-toast"]')
        await helpers.verifyTextContent('[data-testid="save-success-toast"]', 'Profile updated successfully')

        // Verify button returns to normal state
        await helpers.verifyTextContent('[data-testid="save-profile-button"]', 'Save Profile')

        await helpers.takeScreenshot('profile-save-success')
      })

      test.step('Verify profile data persistence', async () => {
        // Reload the page to verify data persistence
        await page.reload()
        await helpers.waitForElement('[data-testid="profile-form"]')

        // Verify all data is loaded correctly
        await expect(page.locator('input[name="name"]')).toHaveValue('John Professional Contractor')
        await expect(page.locator('input[name="title"]')).toHaveValue('Senior Full-Stack Developer')
        await expect(page.locator('textarea[name="bio"]')).toContainText('Experienced full-stack developer')
        await expect(page.locator('input[name="location"]')).toHaveValue('San Francisco, CA (Remote)')
        await expect(page.locator('input[name="hourlyRateMin"]')).toHaveValue('85')
        await expect(page.locator('input[name="hourlyRateMax"]')).toHaveValue('125')
        await expect(page.locator('select[name="availability"]')).toHaveValue('AVAILABLE')

        // Verify skills are selected
        await expect(page.locator('[data-testid="skill-badge-react"]')).toHaveClass(/bg-blue-500/)
        await expect(page.locator('[data-testid="skill-badge-typescript"]')).toHaveClass(/bg-blue-500/)

        await helpers.takeScreenshot('profile-data-persistence')
      })
    })

    test('Profile form validation and error handling', async ({ page }) => {
      test.step('Test required field validation', async () => {
        await helpers.loginAsContractor()
        await helpers.navigateToProfile()

        // Try to save without filling required fields
        await page.click('[data-testid="save-profile-button"]')

        // Verify validation errors for required fields
        await helpers.verifyElementExists('[data-testid="name-validation-error"]')
        await helpers.verifyTextContent('[data-testid="name-validation-error"]', 'Name is required')

        await helpers.takeScreenshot('required-field-validation')
      })

      test.step('Test URL validation', async () => {
        // Fill name to pass basic validation
        await page.fill('input[name="name"]', 'Test User')

        // Test invalid website URL
        await page.fill('input[name="website"]', 'invalid-url')
        await page.blur('input[name="website"]')

        await helpers.verifyElementExists('[data-testid="website-validation-error"]')
        await helpers.verifyTextContent('[data-testid="website-validation-error"]', /invalid URL format/i)

        // Test valid URL
        await page.fill('input[name="website"]', 'https://validwebsite.com')
        await page.blur('input[name="website"]')

        await helpers.verifyElementNotExists('[data-testid="website-validation-error"]')

        // Test LinkedIn URL validation
        await page.fill('input[name="linkedinUrl"]', 'not-a-linkedin-url')
        await page.blur('input[name="linkedinUrl"]')

        await helpers.verifyElementExists('[data-testid="linkedin-validation-error"]')

        await page.fill('input[name="linkedinUrl"]', 'https://linkedin.com/in/validprofile')
        await page.blur('input[name="linkedinUrl"]')

        await helpers.verifyElementNotExists('[data-testid="linkedin-validation-error"]')

        await helpers.takeScreenshot('url-validation')
      })

      test.step('Test hourly rate validation', async () => {
        // Test negative rates
        await page.fill('input[name="hourlyRateMin"]', '-10')
        await page.blur('input[name="hourlyRateMin"]')

        await helpers.verifyElementExists('[data-testid="rate-validation-error"]')
        await helpers.verifyTextContent('[data-testid="rate-validation-error"]', /positive number/i)

        // Test min > max validation
        await page.fill('input[name="hourlyRateMin"]', '100')
        await page.fill('input[name="hourlyRateMax"]', '50')
        await page.blur('input[name="hourlyRateMax"]')

        await helpers.verifyElementExists('[data-testid="rate-range-validation-error"]')
        await helpers.verifyTextContent('[data-testid="rate-range-validation-error"]', /minimum rate cannot be greater than maximum/i)

        // Fix validation
        await page.fill('input[name="hourlyRateMax"]', '150')
        await page.blur('input[name="hourlyRateMax"]')

        await helpers.verifyElementNotExists('[data-testid="rate-range-validation-error"]')

        await helpers.takeScreenshot('rate-validation')
      })

      test.step('Test bio character limit', async () => {
        // Test character limit enforcement
        const longBio = 'A'.repeat(1001) // Exceeds 1000 character limit
        await page.fill('textarea[name="bio"]', longBio)

        // Verify character counter shows over limit
        await helpers.verifyTextContent('[data-testid="bio-character-count"]', '1001/1000')
        
        // Verify save button is disabled
        await expect(page.locator('[data-testid="save-profile-button"]')).toBeDisabled()

        // Fix by reducing length
        const validBio = 'A'.repeat(999)
        await page.fill('textarea[name="bio"]', validBio)

        // Verify counter updates and save is enabled
        await helpers.verifyTextContent('[data-testid="bio-character-count"]', '999/1000')
        await expect(page.locator('[data-testid="save-profile-button"]')).toBeEnabled()

        await helpers.takeScreenshot('bio-character-limit')
      })
    })

    test('Skills management advanced functionality', async ({ page }) => {
      test.step('Test skill search and filtering', async () => {
        await helpers.loginAsContractor()
        await helpers.navigateToProfile()

        // Create many skills to test filtering
        const skillCategories = {
          'Programming Languages': ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go'],
          'Frameworks': ['React', 'Vue.js', 'Angular', 'Express.js', 'Django'],
          'Databases': ['PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'Elasticsearch']
        }

        // Add skills from different categories
        for (const [category, skills] of Object.entries(skillCategories)) {
          for (const skill of skills) {
            await page.fill('input[name="newSkill"]', skill)
            await page.press('input[name="newSkill"]', 'Enter')
          }
        }

        // Test skill search/filter
        await page.fill('input[name="skillSearch"]', 'Script')
        
        // Verify only JavaScript and TypeScript are visible
        await helpers.verifyElementExists('[data-testid="skill-badge-javascript"]')
        await helpers.verifyElementExists('[data-testid="skill-badge-typescript"]')
        await helpers.verifyElementNotExists('[data-testid="skill-badge-python"]')

        // Clear search
        await page.fill('input[name="skillSearch"]', '')

        // Verify all skills are visible again
        await helpers.verifyElementExists('[data-testid="skill-badge-python"]')

        await helpers.takeScreenshot('skill-search-filtering')
      })

      test.step('Test skill category organization', async () => {
        // Test if skills are organized by category
        await helpers.verifyElementExists('[data-testid="skill-category-programming-languages"]')
        await helpers.verifyElementExists('[data-testid="skill-category-frameworks"]')
        await helpers.verifyElementExists('[data-testid="skill-category-databases"]')

        // Verify skills appear under correct categories
        const programmingSection = page.locator('[data-testid="skill-category-programming-languages"]')
        await expect(programmingSection).toContainText('JavaScript')
        await expect(programmingSection).toContainText('TypeScript')

        const frameworksSection = page.locator('[data-testid="skill-category-frameworks"]')
        await expect(frameworksSection).toContainText('React')
        await expect(frameworksSection).toContainText('Vue.js')

        await helpers.takeScreenshot('skill-categories')
      })

      test.step('Test skill recommendations', async () => {
        // Based on selected skills, verify related skills are suggested
        await helpers.verifyElementExists('[data-testid="skill-recommendations"]')
        await helpers.verifyElementExists('text=Based on your selected skills, you might also want to add:')

        // Since React is selected, should recommend related skills
        await helpers.verifyElementExists('[data-testid="suggested-skill-next.js"]')
        await helpers.verifyElementExists('[data-testid="suggested-skill-redux"]')

        // Test adding suggested skill
        await page.click('[data-testid="suggested-skill-next.js"]')
        
        // Verify skill is added and selected
        await helpers.verifyElementExists('[data-testid="skill-badge-next.js"]')
        await expect(page.locator('[data-testid="skill-badge-next.js"]')).toHaveClass(/bg-blue-500/)

        await helpers.takeScreenshot('skill-recommendations')
      })
    })
  })

  test.describe('Profile Visibility and Public View', () => {
    test('Profile appears correctly in public contractor directory', async ({ page }) => {
      test.step('Create and save complete profile', async () => {
        // Create contractor with complete profile
        const contractor = await dbTestHelper.createTestUser('contractor', {
          name: 'Public Contractor',
          email: 'public@contractor.com',
          title: 'Expert React Developer',
          bio: 'Specialized in building scalable React applications',
          location: 'Remote, Worldwide',
          hourlyRateMin: 75,
          hourlyRateMax: 110,
          availability: 'AVAILABLE'
        })

        // Add skills to contractor
        await dbTestHelper.addSkillsToUser(contractor.id, ['React', 'JavaScript', 'TypeScript'])
      })

      test.step('Verify profile appears in contractor directory', async () => {
        // Navigate to contractor directory
        await helpers.navigateToContractorDirectory()

        // Search for the contractor
        await page.fill('[data-testid="contractor-search"]', 'Public Contractor')
        await page.press('[data-testid="contractor-search"]', 'Enter')

        // Verify contractor appears in results
        await helpers.verifyElementExists('[data-testid="contractor-card-public-contractor"]')
        
        // Verify profile information is displayed
        await helpers.verifyTextContent('[data-testid="contractor-name"]', 'Public Contractor')
        await helpers.verifyTextContent('[data-testid="contractor-title"]', 'Expert React Developer')
        await helpers.verifyTextContent('[data-testid="contractor-location"]', 'Remote, Worldwide')
        await helpers.verifyTextContent('[data-testid="contractor-rate"]', '$75 - $110/hr')

        // Verify skills are displayed
        await helpers.verifyElementExists('[data-testid="skill-tag-react"]')
        await helpers.verifyElementExists('[data-testid="skill-tag-javascript"]')

        await helpers.takeScreenshot('contractor-directory-listing')
      })

      test.step('View detailed contractor profile', async () => {
        // Click on contractor to view full profile
        await page.click('[data-testid="contractor-card-public-contractor"]')

        // Verify detailed profile page
        await helpers.waitForElement('[data-testid="contractor-profile-detail"]')
        await helpers.verifyTextContent('[data-testid="profile-name"]', 'Public Contractor')
        await helpers.verifyTextContent('[data-testid="profile-bio"]', 'Specialized in building scalable React applications')

        // Verify availability status is displayed
        await helpers.verifyElementExists('[data-testid="availability-badge-available"]')
        await helpers.verifyTextContent('[data-testid="availability-status"]', 'Available')

        // Verify contact information is appropriate for public view
        await helpers.verifyElementExists('[data-testid="contact-contractor-button"]')
        await helpers.verifyElementNotExists('[data-testid="direct-email"]') // Email should not be public

        await helpers.takeScreenshot('contractor-profile-detail')
      })
    })

    test('Profile privacy controls work correctly', async ({ page }) => {
      test.step('Test profile visibility settings', async () => {
        await helpers.loginAsContractor()
        await helpers.navigateToProfile()

        // Navigate to privacy settings
        await page.click('[data-testid="privacy-settings-tab"]')

        // Test profile visibility toggle
        await helpers.verifyElementExists('[data-testid="profile-visibility-toggle"]')
        
        // Set profile to private
        await page.click('[data-testid="profile-visibility-toggle"]')
        await helpers.verifyElementExists('[data-testid="profile-private-indicator"]')

        // Save settings
        await page.click('[data-testid="save-privacy-settings"]')
        await helpers.waitForElement('[data-testid="privacy-save-success"]')

        await helpers.takeScreenshot('profile-privacy-settings')
      })

      test.step('Verify private profile does not appear in directory', async () => {
        // Log out and check public directory
        await helpers.logout()
        await helpers.navigateToContractorDirectory()

        // Search for the now-private contractor
        await page.fill('[data-testid="contractor-search"]', 'Public Contractor')
        await page.press('[data-testid="contractor-search"]', 'Enter')

        // Verify contractor does not appear in results
        await helpers.verifyElementNotExists('[data-testid="contractor-card-public-contractor"]')
        
        // Verify "no results" message
        await helpers.verifyElementExists('[data-testid="no-contractors-found"]')

        await helpers.takeScreenshot('private-profile-hidden')
      })
    })
  })

  test.describe('Performance and Mobile Responsiveness', () => {
    test('Profile form performance on large datasets', async ({ page }) => {
      test.step('Test profile form with many skills', async () => {
        await helpers.loginAsContractor()
        
        // Create large number of skills in database
        for (let i = 0; i < 100; i++) {
          await dbTestHelper.createTestSkill(`TestSkill${i}`, 'Testing')
        }

        const startTime = Date.now()
        
        await helpers.navigateToProfile()
        await helpers.waitForElement('[data-testid="skills-section"]')

        const loadTime = Date.now() - startTime

        // Verify reasonable load time even with many skills
        expect(loadTime).toBeLessThan(3000) // 3 seconds max

        // Verify skills list is paginated or virtualized for performance
        const visibleSkills = await page.locator('[data-testid^="skill-badge-"]').count()
        expect(visibleSkills).toBeLessThan(50) // Should not load all 100+ skills at once

        console.log(`Profile form load time with 100+ skills: ${loadTime}ms`)

        await helpers.takeScreenshot('large-skills-dataset')
      })
    })

    test('Mobile responsive profile creation', async ({ page }) => {
      test.step('Test mobile profile form layout', async () => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 })

        await helpers.loginAsContractor()
        await helpers.navigateToProfile()

        // Verify form elements stack vertically on mobile
        const nameInput = page.locator('input[name="name"]')
        const titleInput = page.locator('input[name="title"]')

        const nameBox = await nameInput.boundingBox()
        const titleBox = await titleInput.boundingBox()

        // Verify elements are stacked (title below name)
        expect(titleBox?.y).toBeGreaterThan((nameBox?.y || 0) + (nameBox?.height || 0))

        // Verify form fits within viewport
        expect(nameBox?.width).toBeLessThan(375)

        await helpers.takeScreenshot('mobile-profile-form')
      })

      test.step('Test mobile skill management', async () => {
        // Test skill addition on mobile
        const skillInput = page.locator('input[name="newSkill"]')
        await skillInput.fill('Mobile Test Skill')
        
        // Test touch interaction for adding skill
        await page.tap('[data-testid="add-skill-button"]')

        // Verify skill was added
        await helpers.verifyElementExists('[data-testid="skill-badge-mobile-test-skill"]')

        // Test skill wrapping on mobile
        const skillsContainer = page.locator('[data-testid="skills-container"]')
        const containerBox = await skillsContainer.boundingBox()
        
        expect(containerBox?.width).toBeLessThan(375)

        await helpers.takeScreenshot('mobile-skill-management')
      })

      test.step('Test mobile onboarding flow', async () => {
        // Test mobile onboarding
        await helpers.logout()
        await page.setViewportSize({ width: 375, height: 667 })

        await helpers.registerNewUser({
          email: 'mobile@test.com',
          password: 'Password123!',
          name: 'Mobile User'
        })

        // Verify onboarding works on mobile
        await helpers.verifyURL('**/onboarding')
        
        // Test role selection on mobile
        await page.tap('[data-testid="role-contractor"]')
        await page.tap('[data-testid="next-button"]')

        // Verify navigation works on mobile
        await helpers.verifyElementExists('h2:has-text("How ContractsOnly Works")')

        await helpers.takeScreenshot('mobile-onboarding')
      })
    })
  })

  test.afterEach(async () => {
    // Clean up test data
    await dbTestHelper.cleanupTestData()
  })
})