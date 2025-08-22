import { test, expect } from '@playwright/test'
import { E2EHelpers, createE2EJobData } from '../e2e-helpers'
import { dbTestHelper } from '../../setup/database-setup'

test.describe('Rating & Review System', () => {
  let helpers: E2EHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new E2EHelpers(page)
  })

  test.describe('Review Form Functionality', () => {
    test('Employer can rate and review contractor after job completion', async ({ page }) => {
      test.step('Setup job and application workflow', async () => {
        // Create test employer and contractor accounts
        const employer = await dbTestHelper.createTestUser('employer', {
          name: 'Test Employer',
          email: 'employer@test.com'
        })
        
        const contractor = await dbTestHelper.createTestUser('contractor', {
          name: 'Test Contractor', 
          email: 'contractor@test.com'
        })

        // Create a job posting
        const job = await dbTestHelper.createTestJob({
          title: 'Senior React Developer',
          company: 'Tech Company',
          posterId: employer.id,
          status: 'active'
        })

        // Create job application and set to accepted/completed
        const application = await dbTestHelper.createTestApplication({
          jobId: job.id,
          applicantId: contractor.id,
          status: 'accepted'
        })

        // Store test data for cleanup
        test.info().annotations.push({
          type: 'test-data',
          description: JSON.stringify({ employer, contractor, job, application })
        })
      })

      test.step('Employer authentication and navigation to review', async () => {
        await helpers.loginAsEmployer()
        
        // Navigate to completed jobs/applications section
        await helpers.navigateToEmployerDashboard()
        await page.click('[data-testid="completed-jobs-tab"]')
        
        // Find the job and click review button
        await helpers.verifyElementExists(`text=Senior React Developer`)
        await page.click('[data-testid="review-contractor-button"]')
        
        // Verify review form loads
        await helpers.waitForElement('[data-testid="review-form"]')
        await helpers.verifyElementExists('[data-testid="rating-stars"]')
        await helpers.verifyElementExists('textarea[name="comment"]')
      })

      test.step('Test star rating interaction', async () => {
        // Test hover effects on stars
        const stars = page.locator('[data-testid="rating-star"]')
        
        // Hover over third star
        await stars.nth(2).hover()
        
        // Verify first 3 stars are highlighted
        for (let i = 0; i < 3; i++) {
          await expect(stars.nth(i)).toHaveClass(/text-yellow-400/)
        }
        
        // Verify remaining stars are not highlighted
        for (let i = 3; i < 5; i++) {
          await expect(stars.nth(i)).toHaveClass(/text-gray-300/)
        }
        
        // Click on 4th star to set rating
        await stars.nth(3).click()
        
        // Verify rating is set to 4
        await helpers.verifyTextContent('[data-testid="rating-display"]', '4 stars')
        
        await helpers.takeScreenshot('rating-star-interaction')
      })

      test.step('Test review comment validation', async () => {
        // Try to submit with empty comment
        await page.click('[data-testid="submit-review-button"]')
        
        // Verify validation error appears
        await helpers.verifyElementExists('[data-testid="comment-validation-error"]')
        await helpers.verifyTextContent('[data-testid="comment-validation-error"]', 'Please write a review comment')
        
        // Fill in comment
        const reviewComment = 'Excellent contractor! Delivered high-quality work on time and communicated well throughout the project. Highly recommended for React development projects.'
        
        await page.fill('textarea[name="comment"]', reviewComment)
        
        // Verify character counter updates
        await helpers.verifyTextContent('[data-testid="character-counter"]', `${reviewComment.length}/1000 characters`)
        
        await helpers.takeScreenshot('review-form-filled')
      })

      test.step('Submit review and verify success', async () => {
        // Submit the review
        await page.click('[data-testid="submit-review-button"]')
        
        // Verify loading state
        await helpers.verifyElementExists('[data-testid="submit-loading"]')
        await helpers.verifyTextContent('[data-testid="submit-review-button"]', 'Submitting...')
        
        // Wait for success message
        await helpers.waitForElement('[data-testid="review-success-message"]')
        await helpers.verifyTextContent('[data-testid="review-success-message"]', 'Review submitted successfully!')
        
        // Verify form is reset
        await helpers.verifyElementNotExists('[data-testid="rating-display"]')
        await expect(page.locator('textarea[name="comment"]')).toHaveValue('')
        
        await helpers.takeScreenshot('review-submission-success')
      })

      test.step('Verify review appears in contractor profile', async () => {
        // Navigate to contractor profile
        await helpers.navigateToContractorProfile('contractor@test.com')
        
        // Verify review is displayed
        await helpers.verifyElementExists('[data-testid="review-card"]')
        await helpers.verifyElementExists('[data-testid="review-rating-stars"]')
        
        // Verify rating stars show 4 stars
        const reviewStars = page.locator('[data-testid="review-card"] [data-testid="rating-star"]')
        
        for (let i = 0; i < 4; i++) {
          await expect(reviewStars.nth(i)).toHaveClass(/text-yellow-400/)
        }
        
        await expect(reviewStars.nth(4)).toHaveClass(/text-gray-300/)
        
        // Verify review comment is displayed
        await helpers.verifyTextContent('[data-testid="review-comment"]', /Excellent contractor/)
        
        // Verify reviewer information
        await helpers.verifyTextContent('[data-testid="reviewer-name"]', 'Test Employer')
        await helpers.verifyTextContent('[data-testid="reviewer-role"]', 'Employer')
        
        await helpers.takeScreenshot('review-displayed-on-profile')
      })
    })

    test('Contractor can rate and review employer after job completion', async ({ page }) => {
      test.step('Contractor review workflow setup', async () => {
        // Use existing test data from previous test or create new
        await helpers.loginAsContractor()
        await helpers.navigateToContractorDashboard()
        
        // Navigate to completed jobs
        await page.click('[data-testid="completed-jobs-tab"]')
        await page.click('[data-testid="review-employer-button"]')
        
        await helpers.waitForElement('[data-testid="review-form"]')
      })

      test.step('Submit contractor review for employer', async () => {
        // Set 5-star rating
        await page.click('[data-testid="rating-star"]:nth-child(5)')
        
        // Fill review comment
        await page.fill('textarea[name="comment"]', 'Great employer! Clear requirements, fair payment, and excellent communication. Would definitely work with them again.')
        
        // Submit review
        await page.click('[data-testid="submit-review-button"]')
        
        // Verify success
        await helpers.waitForElement('[data-testid="review-success-message"]')
        
        await helpers.takeScreenshot('contractor-review-submitted')
      })
    })

    test('Rating validation and edge cases', async ({ page }) => {
      test.step('Test rating validation requirements', async () => {
        await helpers.loginAsEmployer()
        await helpers.navigateToReviewForm()
        
        // Try to submit without rating
        await page.fill('textarea[name="comment"]', 'This is a test comment')
        await page.click('[data-testid="submit-review-button"]')
        
        // Verify rating validation error
        await helpers.verifyElementExists('[data-testid="rating-validation-error"]')
        await helpers.verifyTextContent('[data-testid="rating-validation-error"]', 'Please select a rating')
      })

      test.step('Test comment length validation', async () => {
        // Set rating first
        await page.click('[data-testid="rating-star"]:nth-child(3)')
        
        // Test maximum character limit
        const longComment = 'A'.repeat(1001) // Exceeds 1000 character limit
        await page.fill('textarea[name="comment"]', longComment)
        
        // Verify character counter shows limit exceeded
        await helpers.verifyTextContent('[data-testid="character-counter"]', '1001/1000 characters')
        
        // Verify submit button is disabled
        await expect(page.locator('[data-testid="submit-review-button"]')).toBeDisabled()
        
        // Test minimum content requirement
        await page.fill('textarea[name="comment"]', '   ') // Only whitespace
        await page.click('[data-testid="submit-review-button"]')
        
        await helpers.verifyElementExists('[data-testid="comment-validation-error"]')
      })

      test.step('Test duplicate review prevention', async () => {
        // Submit first review successfully
        await page.fill('textarea[name="comment"]', 'First review for this job')
        await page.click('[data-testid="submit-review-button"]')
        await helpers.waitForElement('[data-testid="review-success-message"]')
        
        // Try to submit another review for the same job/contractor
        await helpers.navigateToReviewForm() // Same job/contractor
        
        await page.click('[data-testid="rating-star"]:nth-child(4)')
        await page.fill('textarea[name="comment"]', 'Attempting duplicate review')
        await page.click('[data-testid="submit-review-button"]')
        
        // Verify error message about duplicate review
        await helpers.waitForElement('[data-testid="duplicate-review-error"]')
        await helpers.verifyTextContent('[data-testid="duplicate-review-error"]', /already reviewed this person for this job/)
      })
    })
  })

  test.describe('Review Display and Aggregation', () => {
    test('Reviews display correctly on user profiles', async ({ page }) => {
      test.step('Setup multiple reviews for contractor', async () => {
        // Create contractor with multiple completed jobs and reviews
        const contractor = await dbTestHelper.createTestUser('contractor', {
          name: 'Highly Rated Contractor',
          email: 'topcontractor@test.com'
        })

        // Create multiple jobs and reviews with different ratings
        const reviews = [
          { rating: 5, comment: 'Outstanding work quality!' },
          { rating: 4, comment: 'Good communication and delivery.' },
          { rating: 5, comment: 'Exceeded expectations!' },
          { rating: 3, comment: 'Satisfactory work, could improve.' }
        ]

        for (const review of reviews) {
          await dbTestHelper.createTestReview({
            contractorId: contractor.id,
            rating: review.rating,
            comment: review.comment
          })
        }
      })

      test.step('Verify review aggregation and display', async () => {
        await helpers.navigateToContractorProfile('topcontractor@test.com')
        
        // Verify average rating calculation (5+4+5+3)/4 = 4.25
        await helpers.verifyTextContent('[data-testid="average-rating"]', '4.3') // Rounded
        await helpers.verifyTextContent('[data-testid="total-reviews"]', '4 reviews')
        
        // Verify all reviews are displayed
        const reviewCards = page.locator('[data-testid="review-card"]')
        await expect(reviewCards).toHaveCount(4)
        
        // Verify reviews are sorted by date (newest first)
        const firstReview = reviewCards.first()
        await expect(firstReview).toContainText('Satisfactory work, could improve.')
        
        await helpers.takeScreenshot('profile-reviews-display')
      })

      test.step('Test review pagination', async () => {
        // Create additional reviews to test pagination
        for (let i = 0; i < 12; i++) {
          await dbTestHelper.createTestReview({
            contractorId: 'contractor-id',
            rating: 4,
            comment: `Review number ${i + 5}`
          })
        }

        await page.reload()
        
        // Verify pagination controls appear
        await helpers.verifyElementExists('[data-testid="reviews-pagination"]')
        await helpers.verifyElementExists('[data-testid="next-page-button"]')
        
        // Test pagination functionality
        await page.click('[data-testid="next-page-button"]')
        await helpers.waitForNetworkIdle()
        
        // Verify new reviews loaded
        const newReviewCards = page.locator('[data-testid="review-card"]')
        await expect(newReviewCards).toHaveCount(6) // Remaining reviews
        
        await helpers.takeScreenshot('reviews-pagination')
      })
    })

    test('Review filtering and sorting functionality', async ({ page }) => {
      test.step('Test rating filter functionality', async () => {
        await helpers.navigateToContractorProfile('topcontractor@test.com')
        
        // Filter by 5-star reviews only
        await page.click('[data-testid="rating-filter-5-stars"]')
        await helpers.waitForNetworkIdle()
        
        // Verify only 5-star reviews are shown
        const filteredReviews = page.locator('[data-testid="review-card"]')
        await expect(filteredReviews).toHaveCount(2)
        
        // Verify each visible review has 5 stars
        for (let i = 0; i < 2; i++) {
          const reviewStars = filteredReviews.nth(i).locator('[data-testid="rating-star"]')
          for (let j = 0; j < 5; j++) {
            await expect(reviewStars.nth(j)).toHaveClass(/text-yellow-400/)
          }
        }
        
        await helpers.takeScreenshot('reviews-filtered-5-stars')
      })

      test.step('Test review sorting options', async () => {
        // Remove filter first
        await page.click('[data-testid="clear-rating-filter"]')
        await helpers.waitForNetworkIdle()
        
        // Sort by rating (highest first)
        await page.click('[data-testid="sort-by-rating"]')
        await helpers.waitForNetworkIdle()
        
        // Verify sorting order
        const sortedReviews = page.locator('[data-testid="review-card"]')
        const firstReviewRating = await sortedReviews.first().locator('[data-testid="rating-star"].text-yellow-400').count()
        const lastReviewRating = await sortedReviews.last().locator('[data-testid="rating-star"].text-yellow-400').count()
        
        expect(firstReviewRating).toBeGreaterThanOrEqual(lastReviewRating)
        
        await helpers.takeScreenshot('reviews-sorted-by-rating')
      })
    })
  })

  test.describe('Mobile Responsiveness and Accessibility', () => {
    test('Rating system works correctly on mobile devices', async ({ page }) => {
      test.step('Test mobile review form interaction', async () => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 })
        
        await helpers.loginAsEmployer()
        await helpers.navigateToReviewForm()
        
        // Test touch interactions with stars
        const stars = page.locator('[data-testid="rating-star"]')
        
        // Tap on 4th star
        await stars.nth(3).tap()
        
        // Verify rating is set
        await helpers.verifyTextContent('[data-testid="rating-display"]', '4 stars')
        
        // Test mobile textarea resizing
        const textarea = page.locator('textarea[name="comment"]')
        await textarea.fill('Mobile review comment test with sufficient length to trigger any responsive behavior.')
        
        // Verify textarea is properly sized
        const textareaBox = await textarea.boundingBox()
        expect(textareaBox?.width).toBeLessThan(375) // Fits within mobile viewport
        
        await helpers.takeScreenshot('mobile-review-form')
      })

      test.step('Test mobile review display', async () => {
        await helpers.navigateToContractorProfile('contractor@test.com')
        
        // Verify review cards stack properly on mobile
        const reviewCards = page.locator('[data-testid="review-card"]')
        const firstCard = reviewCards.first()
        const secondCard = reviewCards.nth(1)
        
        const firstCardBox = await firstCard.boundingBox()
        const secondCardBox = await secondCard.boundingBox()
        
        // Verify cards are stacked vertically (second card is below first)
        expect(secondCardBox?.y).toBeGreaterThan((firstCardBox?.y || 0) + (firstCardBox?.height || 0))
        
        await helpers.takeScreenshot('mobile-reviews-display')
      })
    })

    test('Rating system accessibility compliance', async ({ page }) => {
      test.step('Test keyboard navigation and screen reader support', async () => {
        await helpers.loginAsEmployer()
        await helpers.navigateToReviewForm()
        
        // Test keyboard navigation through rating stars
        await page.keyboard.press('Tab') // Focus on first star
        await expect(page.locator('[data-testid="rating-star"]:first-child')).toBeFocused()
        
        // Use arrow keys to navigate stars
        await page.keyboard.press('ArrowRight')
        await page.keyboard.press('ArrowRight')
        await page.keyboard.press('Enter') // Select 3rd star
        
        await helpers.verifyTextContent('[data-testid="rating-display"]', '3 stars')
        
        // Test screen reader attributes
        const ratingContainer = page.locator('[data-testid="rating-stars"]')
        await expect(ratingContainer).toHaveAttribute('role', 'radiogroup')
        await expect(ratingContainer).toHaveAttribute('aria-label', 'Rate from 1 to 5 stars')
        
        // Test individual star accessibility
        const firstStar = page.locator('[data-testid="rating-star"]:first-child')
        await expect(firstStar).toHaveAttribute('role', 'radio')
        await expect(firstStar).toHaveAttribute('aria-label', '1 star')
        
        await helpers.takeScreenshot('accessibility-star-focus')
      })

      test.step('Test form label associations and error messaging', async () => {
        const textarea = page.locator('textarea[name="comment"]')
        const textareaLabel = page.locator('label[for="comment"]')
        
        // Verify label association
        await expect(textareaLabel).toHaveAttribute('for', 'comment')
        await expect(textarea).toHaveAttribute('id', 'comment')
        
        // Test error message accessibility
        await page.click('[data-testid="submit-review-button"]') // Trigger validation
        
        const errorMessage = page.locator('[data-testid="comment-validation-error"]')
        await expect(errorMessage).toHaveAttribute('role', 'alert')
        await expect(errorMessage).toHaveAttribute('aria-live', 'polite')
        
        // Verify error is associated with input
        await expect(textarea).toHaveAttribute('aria-describedby', 'comment-error')
        await expect(errorMessage).toHaveAttribute('id', 'comment-error')
      })
    })
  })

  test.describe('Performance and Database Integration', () => {
    test('Review system performance under load', async ({ page }) => {
      test.step('Test review submission performance', async () => {
        await helpers.loginAsEmployer()
        await helpers.navigateToReviewForm()
        
        const startTime = Date.now()
        
        // Fill and submit review
        await page.click('[data-testid="rating-star"]:nth-child(4)')
        await page.fill('textarea[name="comment"]', 'Performance test review submission.')
        
        await page.click('[data-testid="submit-review-button"]')
        await helpers.waitForElement('[data-testid="review-success-message"]')
        
        const endTime = Date.now()
        const submissionTime = endTime - startTime
        
        // Verify submission completes within reasonable time
        expect(submissionTime).toBeLessThan(3000) // 3 seconds max
        
        console.log(`Review submission time: ${submissionTime}ms`)
      })

      test.step('Test review loading performance with large datasets', async () => {
        // Create profile with many reviews
        for (let i = 0; i < 50; i++) {
          await dbTestHelper.createTestReview({
            contractorId: 'contractor-id',
            rating: Math.floor(Math.random() * 5) + 1,
            comment: `Performance test review ${i + 1}`
          })
        }

        const startTime = Date.now()
        
        await helpers.navigateToContractorProfile('contractor@test.com')
        await helpers.waitForElement('[data-testid="review-card"]')
        
        const endTime = Date.now()
        const loadTime = endTime - startTime
        
        // Verify reviews load within acceptable time
        expect(loadTime).toBeLessThan(2000) // 2 seconds max
        
        console.log(`Reviews page load time: ${loadTime}ms`)
      })
    })

    test('Database consistency and error handling', async ({ page }) => {
      test.step('Test review creation with database constraints', async () => {
        await helpers.loginAsEmployer()
        await helpers.navigateToReviewForm()
        
        // Test with valid data
        await page.click('[data-testid="rating-star"]:nth-child(5)')
        await page.fill('textarea[name="comment"]', 'Database consistency test review.')
        
        await page.click('[data-testid="submit-review-button"]')
        await helpers.waitForElement('[data-testid="review-success-message"]')
        
        // Verify review was actually created in database
        const createdReview = await dbTestHelper.getLatestReview()
        expect(createdReview.rating).toBe(5)
        expect(createdReview.comment).toBe('Database consistency test review.')
      })

      test.step('Test error handling for database failures', async () => {
        // Simulate database error by using invalid job ID
        await helpers.navigateToReviewFormWithInvalidJob()
        
        await page.click('[data-testid="rating-star"]:nth-child(3)')
        await page.fill('textarea[name="comment"]', 'This should fail due to invalid job.')
        
        await page.click('[data-testid="submit-review-button"]')
        
        // Verify error handling
        await helpers.waitForElement('[data-testid="review-error-message"]')
        await helpers.verifyTextContent('[data-testid="review-error-message"]', /error occurred/)
        
        // Verify form remains functional after error
        await expect(page.locator('[data-testid="submit-review-button"]')).toBeEnabled()
      })
    })
  })

  test.afterEach(async () => {
    // Clean up test data
    await dbTestHelper.cleanupTestData()
  })
})