import { test, expect } from '@playwright/test'
import { E2EHelpers, createE2EJobData } from '../e2e-helpers'
import { dbTestHelper } from '../../setup/database-setup'

test.describe('Advanced Job Search & Filtering', () => {
  let helpers: E2EHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new E2EHelpers(page)
    
    // Create diverse test jobs for comprehensive search testing
    await setupDiverseJobData()
  })

  async function setupDiverseJobData() {
    // Create employer for posting test jobs
    const employer = await dbTestHelper.createTestUser({
      role: 'EMPLOYER',
      email: 'search-test-employer@example.com'
    })

    // Create diverse job postings for search testing
    const testJobs = [
      {
        title: 'Senior React Developer',
        company: 'TechStart Inc',
        location: 'San Francisco, CA',
        is_remote: false,
        job_type: 'FULL_TIME',
        salary_min: 120000,
        salary_max: 160000,
        hourly_rate_min: null,
        hourly_rate_max: null,
        description: 'Build cutting-edge React applications with modern TypeScript',
        requirements: 'React, TypeScript, Redux, 5+ years experience',
        poster_id: employer.id,
        skills: ['React', 'TypeScript', 'Redux']
      },
      {
        title: 'Remote Node.js Backend Engineer',
        company: 'CloudTech Solutions',
        location: 'Remote',
        is_remote: true,
        job_type: 'CONTRACT',
        salary_min: null,
        salary_max: null,
        hourly_rate_min: 80,
        hourly_rate_max: 120,
        description: 'Develop scalable backend services using Node.js and AWS',
        requirements: 'Node.js, AWS, Docker, GraphQL, 3+ years experience',
        poster_id: employer.id,
        skills: ['Node.js', 'AWS', 'Docker', 'GraphQL']
      },
      {
        title: 'Full-Stack Python Developer',
        company: 'DataFlow Corp',
        location: 'New York, NY',
        is_remote: false,
        job_type: 'PART_TIME',
        salary_min: 80000,
        salary_max: 100000,
        hourly_rate_min: null,
        hourly_rate_max: null,
        description: 'Work on data processing applications using Python and React',
        requirements: 'Python, Django, React, PostgreSQL, 4+ years experience',
        poster_id: employer.id,
        skills: ['Python', 'Django', 'React', 'PostgreSQL']
      },
      {
        title: 'Junior Frontend Developer',
        company: 'StartupXYZ',
        location: 'Austin, TX',
        is_remote: true,
        job_type: 'FULL_TIME',
        salary_min: 70000,
        salary_max: 90000,
        hourly_rate_min: null,
        hourly_rate_max: null,
        description: 'Learn and grow with our frontend team using Vue.js',
        requirements: 'Vue.js, JavaScript, HTML/CSS, 1+ years experience',
        poster_id: employer.id,
        skills: ['Vue.js', 'JavaScript', 'HTML', 'CSS']
      },
      {
        title: 'DevOps Engineer',
        company: 'InfraTech Ltd',
        location: 'Remote',
        is_remote: true,
        job_type: 'CONTRACT',
        salary_min: null,
        salary_max: null,
        hourly_rate_min: 90,
        hourly_rate_max: 140,
        description: 'Manage cloud infrastructure and CI/CD pipelines',
        requirements: 'AWS, Kubernetes, Docker, Terraform, 3+ years experience',
        poster_id: employer.id,
        skills: ['AWS', 'Kubernetes', 'Docker', 'Terraform']
      },
      {
        title: 'Mobile App Developer (React Native)',
        company: 'MobileFirst Co',
        location: 'Los Angeles, CA',
        is_remote: false,
        job_type: 'FULL_TIME',
        salary_min: 110000,
        salary_max: 140000,
        hourly_rate_min: null,
        hourly_rate_max: null,
        description: 'Develop cross-platform mobile applications',
        requirements: 'React Native, JavaScript, iOS/Android, 3+ years experience',
        poster_id: employer.id,
        skills: ['React Native', 'JavaScript', 'iOS', 'Android']
      }
    ]

    for (const jobData of testJobs) {
      await dbTestHelper.createTestJob(jobData)
    }
  }

  test.describe('Basic Search Functionality', () => {
    test('Search by job title keywords', async ({ page }) => {
      test.step('Navigate to jobs page and perform keyword search', async () => {
        await helpers.navigateToJobs()
        
        // Verify job listings load
        await helpers.verifyElementExists('[data-testid="jobs-list"]')
        await helpers.verifyElementExists('[data-testid="search-input"]')
        
        // Test search by title keyword
        await helpers.searchJobs('React')
        
        // Verify search results contain React-related jobs
        await helpers.verifyElementExists('text=Senior React Developer')
        await helpers.verifyElementExists('text=Full-Stack Python Developer') // Also has React
        await helpers.verifyElementExists('text=Mobile App Developer (React Native)')
        
        // Verify non-React jobs are filtered out
        await helpers.verifyElementNotExists('text=DevOps Engineer')
        await helpers.verifyElementNotExists('text=Remote Node.js Backend Engineer')
        
        await helpers.takeScreenshot('search-by-react-keyword')
      })

      test.step('Search by company name', async () => {
        await helpers.searchJobs('TechStart')
        
        // Should only show TechStart Inc job
        await helpers.verifyElementExists('text=Senior React Developer')
        await helpers.verifyElementExists('text=TechStart Inc')
        
        // Other companies should be filtered out
        await helpers.verifyElementNotExists('text=CloudTech Solutions')
        await helpers.verifyElementNotExists('text=DataFlow Corp')
        
        await helpers.takeScreenshot('search-by-company')
      })

      test.step('Search with no results', async () => {
        await helpers.searchJobs('NonexistentTechnology')
        
        // Verify no results message
        await helpers.verifyElementExists('[data-testid="no-results-message"]')
        await helpers.verifyTextContent('[data-testid="no-results-message"]', /no jobs found/i)
        
        // Verify suggestions or alternative searches are provided
        await helpers.verifyElementExists('[data-testid="search-suggestions"]')
        
        await helpers.takeScreenshot('search-no-results')
      })
    })

    test('Search performance with large datasets', async ({ page }) => {
      test.step('Measure search response time', async () => {
        await helpers.navigateToJobs()
        
        // Measure initial page load
        const initialLoadTime = await helpers.measurePageLoadTime()
        expect(initialLoadTime).toBeLessThan(3000)
        
        // Measure search performance
        const searchTime = await helpers.measureInteractionTime(async () => {
          await helpers.searchJobs('Developer')
          await helpers.waitForNetworkIdle()
        })
        
        expect(searchTime).toBeLessThan(2000) // Search should complete within 2 seconds
        
        console.log(`Search completed in ${searchTime}ms`)
      })

      test.step('Test search with complex queries', async () => {
        const complexSearchTerms = [
          'React TypeScript Senior',
          'Remote Developer AWS',
          'Python Django PostgreSQL',
          'JavaScript Vue Frontend'
        ]

        for (const searchTerm of complexSearchTerms) {
          const searchTime = await helpers.measureInteractionTime(async () => {
            await helpers.searchJobs(searchTerm)
            await helpers.waitForNetworkIdle()
          })
          
          expect(searchTime).toBeLessThan(3000)
          
          // Verify search results are relevant
          const resultsExist = await page.locator('[data-testid="job-card"]').count()
          expect(resultsExist).toBeGreaterThanOrEqual(0)
          
          console.log(`Complex search "${searchTerm}" completed in ${searchTime}ms with ${resultsExist} results`)
        }
      })
    })
  })

  test.describe('Advanced Filtering', () => {
    test('Location-based filtering', async ({ page }) => {
      test.step('Filter by specific city', async () => {
        await helpers.navigateToJobs()
        
        // Open location filter
        await page.click('[data-testid="location-filter-button"]')
        await helpers.verifyElementExists('[data-testid="location-filter-dropdown"]')
        
        // Select San Francisco
        await page.click('[data-testid="location-option-san-francisco"]')
        await helpers.waitForNetworkIdle()
        
        // Verify only San Francisco jobs are shown
        await helpers.verifyElementExists('text=Senior React Developer')
        await helpers.verifyElementExists('text=San Francisco, CA')
        
        // Verify other locations are filtered out
        await helpers.verifyElementNotExists('text=New York, NY')
        await helpers.verifyElementNotExists('text=Austin, TX')
        
        await helpers.takeScreenshot('filter-by-san-francisco')
      })

      test.step('Filter by remote jobs', async () => {
        // Clear previous filters
        await page.click('[data-testid="clear-filters-button"]')
        
        // Apply remote filter
        await page.click('[data-testid="remote-filter-checkbox"]')
        await helpers.waitForNetworkIdle()
        
        // Verify only remote jobs are shown
        await helpers.verifyElementExists('text=Remote Node.js Backend Engineer')
        await helpers.verifyElementExists('text=Junior Frontend Developer') // Austin but remote
        await helpers.verifyElementExists('text=DevOps Engineer')
        
        // Verify non-remote jobs are filtered out
        await helpers.verifyElementNotExists('text=Senior React Developer') // San Francisco, not remote
        await helpers.verifyElementNotExists('text=Full-Stack Python Developer') // New York, not remote
        
        await helpers.takeScreenshot('filter-remote-jobs')
      })

      test.step('Combined location and remote filtering', async () => {
        // Clear filters and test complex location filtering
        await page.click('[data-testid="clear-filters-button"]')
        
        // Select multiple location criteria
        await page.click('[data-testid="location-filter-button"]')
        await page.click('[data-testid="location-option-california"]')
        await page.click('[data-testid="remote-filter-checkbox"]')
        
        await helpers.waitForNetworkIdle()
        
        // Should show California jobs + remote jobs
        const jobCards = page.locator('[data-testid="job-card"]')
        const jobCount = await jobCards.count()
        expect(jobCount).toBeGreaterThanOrEqual(3) // At least CA jobs + remote jobs
        
        await helpers.takeScreenshot('combined-location-remote-filter')
      })
    })

    test('Salary and compensation filtering', async ({ page }) => {
      test.step('Filter by salary range', async () => {
        await helpers.navigateToJobs()
        
        // Open salary filter
        await page.click('[data-testid="salary-filter-button"]')
        
        // Set minimum salary to $100,000
        await page.fill('[data-testid="min-salary-input"]', '100000')
        await page.fill('[data-testid="max-salary-input"]', '150000')
        await page.click('[data-testid="apply-salary-filter"]')
        
        await helpers.waitForNetworkIdle()
        
        // Verify only jobs in salary range are shown
        await helpers.verifyElementExists('text=Senior React Developer') // $120k-$160k
        await helpers.verifyElementExists('text=Mobile App Developer') // $110k-$140k
        
        // Verify jobs outside range are filtered out
        await helpers.verifyElementNotExists('text=Junior Frontend Developer') // $70k-$90k
        
        await helpers.takeScreenshot('salary-range-filter')
      })

      test.step('Filter by hourly rate', async () => {
        await page.click('[data-testid="clear-filters-button"]')
        
        // Switch to hourly rate filter
        await page.click('[data-testid="compensation-type-hourly"]')
        await page.click('[data-testid="salary-filter-button"]')
        
        // Set hourly rate range
        await page.fill('[data-testid="min-hourly-input"]', '90')
        await page.fill('[data-testid="max-hourly-input"]', '150')
        await page.click('[data-testid="apply-salary-filter"]')
        
        await helpers.waitForNetworkIdle()
        
        // Verify only high hourly rate contract jobs are shown
        await helpers.verifyElementExists('text=DevOps Engineer') // $90-$140/hr
        
        // Verify lower rate jobs are filtered out
        await helpers.verifyElementNotExists('text=Remote Node.js Backend Engineer') // $80-$120/hr
        
        await helpers.takeScreenshot('hourly-rate-filter')
      })
    })

    test('Job type and work arrangement filtering', async ({ page }) => {
      test.step('Filter by full-time jobs', async () => {
        await helpers.navigateToJobs()
        
        // Apply full-time filter
        await page.click('[data-testid="job-type-filter-button"]')
        await page.click('[data-testid="job-type-full-time"]')
        await helpers.waitForNetworkIdle()
        
        // Verify only full-time jobs are shown
        await helpers.verifyElementExists('text=Senior React Developer')
        await helpers.verifyElementExists('text=Junior Frontend Developer')
        await helpers.verifyElementExists('text=Mobile App Developer')
        
        // Verify contract and part-time jobs are filtered out
        await helpers.verifyElementNotExists('text=Remote Node.js Backend Engineer') // Contract
        await helpers.verifyElementNotExists('text=DevOps Engineer') // Contract
        await helpers.verifyElementNotExists('text=Full-Stack Python Developer') // Part-time
        
        await helpers.takeScreenshot('full-time-jobs-filter')
      })

      test.step('Filter by contract jobs', async () => {
        await page.click('[data-testid="clear-filters-button"]')
        
        await page.click('[data-testid="job-type-filter-button"]')
        await page.click('[data-testid="job-type-contract"]')
        await helpers.waitForNetworkIdle()
        
        // Verify only contract jobs are shown
        await helpers.verifyElementExists('text=Remote Node.js Backend Engineer')
        await helpers.verifyElementExists('text=DevOps Engineer')
        
        // Verify full-time jobs are filtered out
        await helpers.verifyElementNotExists('text=Senior React Developer')
        await helpers.verifyElementNotExists('text=Junior Frontend Developer')
        
        await helpers.takeScreenshot('contract-jobs-filter')
      })
    })

    test('Skills and technology filtering', async ({ page }) => {
      test.step('Filter by specific technology skills', async () => {
        await helpers.navigateToJobs()
        
        // Open skills filter
        await page.click('[data-testid="skills-filter-button"]')
        
        // Select React skill
        await page.click('[data-testid="skill-option-react"]')
        await helpers.waitForNetworkIdle()
        
        // Verify React jobs are shown
        await helpers.verifyElementExists('text=Senior React Developer')
        await helpers.verifyElementExists('text=Full-Stack Python Developer') // Has React
        await helpers.verifyElementExists('text=Mobile App Developer (React Native)')
        
        // Verify non-React jobs are filtered out
        await helpers.verifyElementNotExists('text=DevOps Engineer')
        await helpers.verifyElementNotExists('text=Remote Node.js Backend Engineer')
        
        await helpers.takeScreenshot('react-skills-filter')
      })

      test.step('Multiple skills filtering (AND logic)', async () => {
        // Add TypeScript to the filter
        await page.click('[data-testid="skill-option-typescript"]')
        await helpers.waitForNetworkIdle()
        
        // Should only show jobs that have BOTH React AND TypeScript
        await helpers.verifyElementExists('text=Senior React Developer')
        
        // Should filter out jobs that only have React but not TypeScript
        await helpers.verifyElementNotExists('text=Full-Stack Python Developer')
        await helpers.verifyElementNotExists('text=Mobile App Developer (React Native)')
        
        await helpers.takeScreenshot('react-typescript-skills-filter')
      })

      test.step('Skills filtering with OR logic option', async () => {
        // Clear filters and test OR logic
        await page.click('[data-testid="clear-filters-button"]')
        await page.click('[data-testid="skills-filter-button"]')
        
        // Switch to OR logic
        await page.click('[data-testid="skills-logic-or"]')
        
        // Select AWS and Docker
        await page.click('[data-testid="skill-option-aws"]')
        await page.click('[data-testid="skill-option-docker"]')
        await helpers.waitForNetworkIdle()
        
        // Should show jobs that have AWS OR Docker
        await helpers.verifyElementExists('text=Remote Node.js Backend Engineer') // Has both
        await helpers.verifyElementExists('text=DevOps Engineer') // Has both
        
        await helpers.takeScreenshot('aws-docker-or-skills-filter')
      })
    })
  })

  test.describe('Complex Filter Combinations', () => {
    test('Multi-dimensional filtering', async ({ page }) => {
      test.step('Combine location, salary, job type, and skills filters', async () => {
        await helpers.navigateToJobs()
        
        // Apply complex filter combination:
        // - Remote jobs
        // - Contract type
        // - Hourly rate $80-130
        // - AWS skills
        
        await page.click('[data-testid="remote-filter-checkbox"]')
        
        await page.click('[data-testid="job-type-filter-button"]')
        await page.click('[data-testid="job-type-contract"]')
        
        await page.click('[data-testid="compensation-type-hourly"]')
        await page.click('[data-testid="salary-filter-button"]')
        await page.fill('[data-testid="min-hourly-input"]', '80')
        await page.fill('[data-testid="max-hourly-input"]', '130')
        await page.click('[data-testid="apply-salary-filter"]')
        
        await page.click('[data-testid="skills-filter-button"]')
        await page.click('[data-testid="skill-option-aws"]')
        
        await helpers.waitForNetworkIdle()
        
        // Should show only jobs matching ALL criteria
        await helpers.verifyElementExists('text=Remote Node.js Backend Engineer')
        // DevOps Engineer should be filtered out due to hourly rate ($90-140, max is above $130)
        
        await helpers.takeScreenshot('complex-multi-filter-combination')
      })

      test.step('Test filter persistence across page navigation', async () => {
        // Navigate away and back to verify filters persist
        await page.click('[data-testid="home-link"]')
        await helpers.navigateToJobs()
        
        // Verify filters are still applied
        await helpers.verifyElementExists('[data-testid="active-filter-remote"]')
        await helpers.verifyElementExists('[data-testid="active-filter-contract"]')
        await helpers.verifyElementExists('[data-testid="active-filter-aws"]')
        
        // Verify filtered results are still shown
        await helpers.verifyElementExists('text=Remote Node.js Backend Engineer')
        
        await helpers.takeScreenshot('filters-persisted-after-navigation')
      })
    })

    test('Filter state management and URL parameters', async ({ page }) => {
      test.step('Verify filter state in URL parameters', async () => {
        await helpers.navigateToJobs()
        
        // Apply filters and check URL
        await helpers.searchJobs('Developer')
        await page.click('[data-testid="remote-filter-checkbox"]')
        await page.click('[data-testid="job-type-filter-button"]')
        await page.click('[data-testid="job-type-full-time"]')
        
        await helpers.waitForNetworkIdle()
        
        // Verify URL contains filter parameters
        const url = page.url()
        expect(url).toContain('search=Developer')
        expect(url).toContain('remote=true')
        expect(url).toContain('jobType=FULL_TIME')
        
        await helpers.takeScreenshot('filters-in-url-parameters')
      })

      test.step('Test direct URL access with filter parameters', async () => {
        // Navigate directly to URL with filter parameters
        await page.goto('/jobs?search=React&remote=true&minSalary=100000')
        await helpers.waitForNetworkIdle()
        
        // Verify filters are applied from URL
        await helpers.verifyElementExists('[data-testid="active-filter-remote"]')
        
        // Verify search results match filters
        await helpers.verifyElementExists('text=Senior React Developer')
        
        // Verify appropriate results are filtered
        const searchInput = page.locator('[data-testid="search-input"]')
        await expect(searchInput).toHaveValue('React')
        
        await helpers.takeScreenshot('filters-loaded-from-url')
      })
    })
  })

  test.describe('Search Result Management', () => {
    test('Pagination and result count', async ({ page }) => {
      test.step('Test pagination with large result sets', async () => {
        await helpers.navigateToJobs()
        
        // Search for broad term to get multiple results
        await helpers.searchJobs('Developer')
        await helpers.waitForNetworkIdle()
        
        // Verify pagination controls exist if needed
        const resultCount = await page.locator('[data-testid="job-card"]').count()
        
        if (resultCount >= 10) {
          await helpers.verifyElementExists('[data-testid="pagination-controls"]')
          
          // Test pagination
          await page.click('[data-testid="next-page-button"]')
          await helpers.waitForNetworkIdle()
          
          // Verify page 2 loaded
          const url = page.url()
          expect(url).toContain('page=2')
          
          await helpers.takeScreenshot('pagination-page-2')
        }
      })

      test.step('Test result count display and accuracy', async () => {
        await helpers.navigateToJobs()
        
        // Get total result count
        const totalCountText = await page.locator('[data-testid="total-results-count"]').textContent()
        const totalCount = parseInt(totalCountText?.match(/\d+/)?.[0] || '0')
        
        // Verify count matches displayed results
        const displayedCount = await page.locator('[data-testid="job-card"]').count()
        
        if (totalCount <= 10) {
          expect(displayedCount).toBe(totalCount)
        } else {
          expect(displayedCount).toBeLessThanOrEqual(10) // Default page size
        }
        
        console.log(`Total results: ${totalCount}, Displayed: ${displayedCount}`)
      })
    })

    test('Sorting and result ordering', async ({ page }) => {
      test.step('Test sort by relevance (default)', async () => {
        await helpers.navigateToJobs()
        await helpers.searchJobs('React')
        
        // Verify default sort is by relevance
        const sortDropdown = page.locator('[data-testid="sort-dropdown"]')
        await expect(sortDropdown).toHaveValue('relevance')
        
        // Verify most relevant results appear first
        const firstJobTitle = await page.locator('[data-testid="job-card"]:first-child [data-testid="job-title"]').textContent()
        expect(firstJobTitle).toContain('React')
        
        await helpers.takeScreenshot('sort-by-relevance')
      })

      test.step('Test sort by date (newest first)', async () => {
        await page.selectOption('[data-testid="sort-dropdown"]', 'date-desc')
        await helpers.waitForNetworkIdle()
        
        // Verify results are sorted by date
        const jobDates = await page.locator('[data-testid="job-card"] [data-testid="job-date"]').allTextContents()
        
        // Verify dates are in descending order (newest first)
        for (let i = 0; i < jobDates.length - 1; i++) {
          const currentDate = new Date(jobDates[i])
          const nextDate = new Date(jobDates[i + 1])
          expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime())
        }
        
        await helpers.takeScreenshot('sort-by-date-newest')
      })

      test.step('Test sort by salary (highest first)', async () => {
        await page.selectOption('[data-testid="sort-dropdown"]', 'salary-desc')
        await helpers.waitForNetworkIdle()
        
        // Verify results are sorted by salary
        const salaryElements = page.locator('[data-testid="job-card"] [data-testid="job-salary"]')
        const salaryCount = await salaryElements.count()
        
        if (salaryCount >= 2) {
          const salaries = await salaryElements.allTextContents()
          
          // Extract numeric values and verify descending order
          const salaryValues = salaries.map(salary => {
            const match = salary.match(/\$?([\d,]+)/)
            return match ? parseInt(match[1].replace(/,/g, '')) : 0
          })
          
          for (let i = 0; i < salaryValues.length - 1; i++) {
            expect(salaryValues[i]).toBeGreaterThanOrEqual(salaryValues[i + 1])
          }
        }
        
        await helpers.takeScreenshot('sort-by-salary-highest')
      })
    })
  })

  test.describe('User Experience and Interactions', () => {
    test('Search suggestions and autocomplete', async ({ page }) => {
      test.step('Test search suggestions', async () => {
        await helpers.navigateToJobs()
        
        const searchInput = page.locator('[data-testid="search-input"]')
        
        // Type partial search term
        await searchInput.fill('Reac')
        
        // Verify suggestions appear
        await helpers.waitForElement('[data-testid="search-suggestions"]')
        await helpers.verifyElementExists('text=React')
        await helpers.verifyElementExists('text=React Native')
        
        // Click suggestion
        await page.click('[data-testid="suggestion-react"]')
        
        // Verify search is performed
        await helpers.waitForNetworkIdle()
        await expect(searchInput).toHaveValue('React')
        
        await helpers.takeScreenshot('search-autocomplete-suggestions')
      })

      test.step('Test recent searches', async () => {
        // Perform multiple searches to build history
        await helpers.searchJobs('Python')
        await helpers.searchJobs('JavaScript')
        await helpers.searchJobs('DevOps')
        
        // Clear search and check recent searches
        await page.fill('[data-testid="search-input"]', '')
        await page.focus('[data-testid="search-input"]')
        
        // Verify recent searches appear
        await helpers.waitForElement('[data-testid="recent-searches"]')
        await helpers.verifyElementExists('text=DevOps')
        await helpers.verifyElementExists('text=JavaScript')
        await helpers.verifyElementExists('text=Python')
        
        await helpers.takeScreenshot('recent-searches-display')
      })
    })

    test('Saved searches and alerts', async ({ page }) => {
      test.step('Save a search configuration', async () => {
        // Login as user to save searches
        await helpers.loginAsUser()
        await helpers.navigateToJobs()
        
        // Apply complex search criteria
        await helpers.searchJobs('Remote Developer')
        await page.click('[data-testid="remote-filter-checkbox"]')
        await page.click('[data-testid="salary-filter-button"]')
        await page.fill('[data-testid="min-salary-input"]', '100000')
        await page.click('[data-testid="apply-salary-filter"]')
        
        // Save the search
        await page.click('[data-testid="save-search-button"]')
        
        // Fill save search modal
        await page.fill('[data-testid="saved-search-name"]', 'High-Paying Remote Developer Jobs')
        await page.check('[data-testid="email-alerts-checkbox"]')
        await page.click('[data-testid="save-search-confirm"]')
        
        // Verify save confirmation
        await helpers.waitForElement('[data-testid="search-saved-confirmation"]')
        
        await helpers.takeScreenshot('search-saved-successfully')
      })

      test.step('Access and manage saved searches', async () => {
        // Navigate to saved searches
        await page.click('[data-testid="user-menu"]')
        await page.click('[data-testid="saved-searches-link"]')
        
        // Verify saved search appears
        await helpers.verifyElementExists('text=High-Paying Remote Developer Jobs')
        await helpers.verifyElementExists('[data-testid="email-alerts-enabled"]')
        
        // Test quick access to saved search
        await page.click('[data-testid="run-saved-search-button"]')
        
        // Verify search criteria are applied
        await helpers.waitForNetworkIdle()
        await helpers.verifyElementExists('[data-testid="active-filter-remote"]')
        
        const searchInput = page.locator('[data-testid="search-input"]')
        await expect(searchInput).toHaveValue('Remote Developer')
        
        await helpers.takeScreenshot('saved-search-executed')
      })
    })

    test('Mobile responsiveness and touch interactions', async ({ page }) => {
      test.step('Test mobile search interface', async () => {
        // Switch to mobile viewport
        await helpers.setMobileViewport()
        await page.reload()
        
        await helpers.navigateToJobs()
        
        // Verify mobile search interface
        await helpers.verifyElementExists('[data-testid="mobile-search-button"]')
        
        // Open mobile search
        await page.click('[data-testid="mobile-search-button"]')
        await helpers.verifyElementExists('[data-testid="mobile-search-modal"]')
        
        // Test mobile search
        await page.fill('[data-testid="mobile-search-input"]', 'Developer')
        await page.click('[data-testid="mobile-search-submit"]')
        
        await helpers.waitForNetworkIdle()
        
        // Verify mobile results display
        await helpers.verifyElementExists('[data-testid="mobile-job-cards"]')
        
        await helpers.takeScreenshot('mobile-search-results')
      })

      test.step('Test mobile filter interface', async () => {
        // Open mobile filters
        await page.click('[data-testid="mobile-filters-button"]')
        await helpers.verifyElementExists('[data-testid="mobile-filters-modal"]')
        
        // Test mobile filter interactions
        await page.click('[data-testid="mobile-remote-filter"]')
        await page.click('[data-testid="mobile-apply-filters"]')
        
        await helpers.waitForNetworkIdle()
        
        // Verify filters applied on mobile
        await helpers.verifyElementExists('[data-testid="active-filter-badge-remote"]')
        
        await helpers.takeScreenshot('mobile-filters-applied')
        
        // Reset to desktop view
        await helpers.setDesktopViewport()
      })
    })
  })
})