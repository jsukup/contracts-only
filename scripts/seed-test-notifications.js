/**
 * Test Data Seeder for Email Notification Testing
 * 
 * This script creates a variety of job postings and user interactions
 * to test all notification scenarios including:
 * - Weekly digests for contractors
 * - Recruiter performance reports
 * - Job matching algorithms
 * - Application status updates
 * - Date-based filtering
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Test user IDs (you'll need to replace with actual user IDs from your database)
const TEST_USERS = {
  contractor1: null, // Will be created or fetched
  contractor2: null,
  recruiter1: null,
  recruiter2: null
}

// Professional skills for matching
const SKILLS = [
  { name: 'JavaScript', category: 'Programming' },
  { name: 'TypeScript', category: 'Programming' },
  { name: 'React', category: 'Frontend' },
  { name: 'Node.js', category: 'Backend' },
  { name: 'Python', category: 'Programming' },
  { name: 'AWS', category: 'Cloud' },
  { name: 'Docker', category: 'DevOps' },
  { name: 'PostgreSQL', category: 'Database' },
  { name: 'GraphQL', category: 'API' },
  { name: 'Next.js', category: 'Frontend' }
]

// Job posting templates with varied characteristics
const JOB_TEMPLATES = [
  // Recent jobs (posted today)
  {
    title: 'Senior React Developer',
    description: 'We are looking for an experienced React developer to join our remote team. Must have strong TypeScript skills and experience with Next.js.',
    company: 'TechCorp Solutions',
    location: 'Remote',
    is_remote: true,
    job_type: 'CONTRACT',
    hourly_rate_min: 75,
    hourly_rate_max: 125,
    currency: 'USD',
    contract_duration: '6 months',
    hours_per_week: 40,
    experience_level: 'SENIOR',
    requirements: '5+ years React, TypeScript, Next.js experience required',
    skills: ['React', 'TypeScript', 'Next.js'],
    daysAgo: 0
  },
  {
    title: 'Python Backend Engineer',
    description: 'Building scalable microservices with Python and AWS. Docker and Kubernetes experience preferred.',
    company: 'CloudScale Inc',
    location: 'San Francisco, CA',
    is_remote: false,
    job_type: 'CONTRACT',
    hourly_rate_min: 80,
    hourly_rate_max: 140,
    currency: 'USD',
    contract_duration: '3 months',
    hours_per_week: 40,
    experience_level: 'MID',
    requirements: 'Python, AWS, Docker experience',
    skills: ['Python', 'AWS', 'Docker'],
    daysAgo: 0
  },
  
  // Jobs from this week (1-6 days ago)
  {
    title: 'Full Stack JavaScript Developer',
    description: 'Full stack role working with React and Node.js. PostgreSQL experience is a plus.',
    company: 'StartupXYZ',
    location: 'New York, NY',
    is_remote: true,
    job_type: 'FREELANCE',
    hourly_rate_min: 60,
    hourly_rate_max: 100,
    currency: 'USD',
    contract_duration: '2 months',
    hours_per_week: 30,
    experience_level: 'MID',
    requirements: 'JavaScript, React, Node.js',
    skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL'],
    daysAgo: 2
  },
  {
    title: 'DevOps Engineer',
    description: 'Help us improve our CI/CD pipeline and cloud infrastructure. AWS and Docker expertise required.',
    company: 'Enterprise Systems',
    location: 'Austin, TX',
    is_remote: true,
    job_type: 'CONTRACT',
    hourly_rate_min: 90,
    hourly_rate_max: 150,
    currency: 'USD',
    contract_duration: '12 months',
    hours_per_week: 40,
    experience_level: 'SENIOR',
    requirements: 'AWS, Docker, CI/CD experience',
    skills: ['AWS', 'Docker', 'JavaScript'],
    daysAgo: 3
  },
  {
    title: 'GraphQL API Developer',
    description: 'Design and implement GraphQL APIs for our next-gen platform.',
    company: 'API Masters',
    location: 'Remote',
    is_remote: true,
    job_type: 'CONTRACT',
    hourly_rate_min: 70,
    hourly_rate_max: 120,
    currency: 'USD',
    contract_duration: '4 months',
    hours_per_week: 40,
    experience_level: 'MID',
    requirements: 'GraphQL, Node.js, TypeScript',
    skills: ['GraphQL', 'Node.js', 'TypeScript'],
    daysAgo: 5
  },
  
  // Older jobs (7-14 days ago)
  {
    title: 'Junior React Developer',
    description: 'Great opportunity for a junior developer to grow with our team.',
    company: 'Learning Labs',
    location: 'Boston, MA',
    is_remote: false,
    job_type: 'CONTRACT',
    hourly_rate_min: 40,
    hourly_rate_max: 60,
    currency: 'USD',
    contract_duration: '3 months',
    hours_per_week: 40,
    experience_level: 'JUNIOR',
    requirements: 'Basic React knowledge',
    skills: ['React', 'JavaScript'],
    daysAgo: 8
  },
  {
    title: 'Database Administrator',
    description: 'PostgreSQL expert needed for database optimization and maintenance.',
    company: 'DataCorp',
    location: 'Seattle, WA',
    is_remote: true,
    job_type: 'CONTRACT',
    hourly_rate_min: 85,
    hourly_rate_max: 135,
    currency: 'USD',
    contract_duration: '6 months',
    hours_per_week: 40,
    experience_level: 'SENIOR',
    requirements: 'PostgreSQL, performance tuning',
    skills: ['PostgreSQL', 'Python'],
    daysAgo: 10
  },
  
  // Very old jobs (15-30 days ago) - should not appear in weekly digest
  {
    title: 'Legacy System Maintenance',
    description: 'Maintain and update legacy JavaScript applications.',
    company: 'OldTech Corp',
    location: 'Phoenix, AZ',
    is_remote: false,
    job_type: 'CONTRACT',
    hourly_rate_min: 50,
    hourly_rate_max: 80,
    currency: 'USD',
    contract_duration: '1 month',
    hours_per_week: 20,
    experience_level: 'MID',
    requirements: 'JavaScript, legacy systems',
    skills: ['JavaScript'],
    daysAgo: 20
  },
  {
    title: 'Expired Contract Position',
    description: 'This position has already been filled.',
    company: 'Past Company',
    location: 'Remote',
    is_remote: true,
    job_type: 'CONTRACT',
    hourly_rate_min: 60,
    hourly_rate_max: 90,
    currency: 'USD',
    contract_duration: '2 months',
    hours_per_week: 40,
    experience_level: 'MID',
    requirements: 'Various skills',
    skills: ['React', 'Node.js'],
    daysAgo: 30,
    is_active: false // This job should be inactive
  }
]

async function setupTestUsers() {
  console.log('📝 Setting up test users...')
  
  // Create or fetch test contractors
  const contractor1Email = 'test-contractor-1@example.com'
  const contractor2Email = 'test-contractor-2@example.com'
  const recruiter1Email = 'test-recruiter-1@example.com'
  const recruiter2Email = 'test-recruiter-2@example.com'
  
  // Check for existing users or create new ones
  const { data: existingUsers } = await supabase
    .from('users')
    .select('*')
    .in('email', [contractor1Email, contractor2Email, recruiter1Email, recruiter2Email])
  
  const usersToCreate = []
  
  if (!existingUsers?.find(u => u.email === contractor1Email)) {
    usersToCreate.push({
      id: `user_test_contractor_1_${Date.now()}`, // Clerk-style user ID
      email: contractor1Email,
      name: 'Test Contractor One',
      role: 'CONTRACTOR',
      title: 'Senior Full Stack Developer',
      bio: 'Experienced developer with React and Node.js expertise',
      location: 'San Francisco, CA',
      hourly_rate_min: 70,
      hourly_rate_max: 120,
      availability: 'AVAILABLE',
      job_alerts_enabled: true,
      email_verified: new Date().toISOString()
    })
  }
  
  if (!existingUsers?.find(u => u.email === contractor2Email)) {
    usersToCreate.push({
      id: `user_test_contractor_2_${Date.now() + 1}`, // Clerk-style user ID
      email: contractor2Email,
      name: 'Test Contractor Two',
      role: 'CONTRACTOR',
      title: 'DevOps Engineer',
      bio: 'Cloud infrastructure and automation specialist',
      location: 'Austin, TX',
      hourly_rate_min: 80,
      hourly_rate_max: 140,
      availability: 'AVAILABLE',
      job_alerts_enabled: true,
      email_verified: new Date().toISOString()
    })
  }
  
  if (!existingUsers?.find(u => u.email === recruiter1Email)) {
    usersToCreate.push({
      id: `user_test_recruiter_1_${Date.now() + 2}`, // Clerk-style user ID
      email: recruiter1Email,
      name: 'Test Recruiter One',
      role: 'RECRUITER',
      title: 'Technical Recruiter',
      bio: 'Helping companies find top tech talent',
      location: 'New York, NY',
      availability: 'AVAILABLE', // Required field
      job_alerts_enabled: false, // Recruiters don't need job alerts
      email_verified: new Date().toISOString()
      // Note: company info is stored in jobs table, not users
    })
  }
  
  if (!existingUsers?.find(u => u.email === recruiter2Email)) {
    usersToCreate.push({
      id: `user_test_recruiter_2_${Date.now() + 3}`, // Clerk-style user ID
      email: recruiter2Email,
      name: 'Test Recruiter Two',
      role: 'RECRUITER',
      title: 'Talent Acquisition Manager',
      bio: 'Building great engineering teams',
      location: 'Seattle, WA',
      availability: 'AVAILABLE', // Required field
      job_alerts_enabled: false, // Recruiters don't need job alerts
      email_verified: new Date().toISOString()
      // Note: company info is stored in jobs table, not users
    })
  }
  
  if (usersToCreate.length > 0) {
    const { data: newUsers, error } = await supabase
      .from('users')
      .insert(usersToCreate)
      .select()
    
    if (error) {
      console.error('Error creating users:', error)
      return false
    }
    
    console.log(`✅ Created ${newUsers.length} test users`)
  }
  
  // Fetch all test users
  const { data: allUsers } = await supabase
    .from('users')
    .select('*')
    .in('email', [contractor1Email, contractor2Email, recruiter1Email, recruiter2Email])
  
  allUsers.forEach(user => {
    if (user.email === contractor1Email) TEST_USERS.contractor1 = user
    if (user.email === contractor2Email) TEST_USERS.contractor2 = user
    if (user.email === recruiter1Email) TEST_USERS.recruiter1 = user
    if (user.email === recruiter2Email) TEST_USERS.recruiter2 = user
  })
  
  console.log('✅ Test users ready:', Object.keys(TEST_USERS).map(k => TEST_USERS[k]?.email))
  return true
}

async function setupSkills() {
  console.log('🎯 Setting up skills...')
  
  for (const skill of SKILLS) {
    const { data: existing } = await supabase
      .from('skills')
      .select('id')
      .eq('name', skill.name)
      .single()
    
    if (!existing) {
      const { error } = await supabase
        .from('skills')
        .insert(skill)
      
      if (error) {
        console.error(`Error creating skill ${skill.name}:`, error)
      }
    }
  }
  
  console.log('✅ Skills ready')
  
  // Add skills to test contractors
  const skillsToAdd = [
    { userId: TEST_USERS.contractor1?.id, skills: ['React', 'TypeScript', 'Next.js', 'Node.js', 'PostgreSQL'] },
    { userId: TEST_USERS.contractor2?.id, skills: ['AWS', 'Docker', 'Python', 'PostgreSQL', 'JavaScript'] }
  ]
  
  for (const userSkills of skillsToAdd) {
    if (!userSkills.userId) continue
    
    for (const skillName of userSkills.skills) {
      const { data: skill } = await supabase
        .from('skills')
        .select('id')
        .eq('name', skillName)
        .single()
      
      if (skill) {
        const { data: existing } = await supabase
          .from('user_skills')
          .select('id')
          .eq('user_id', userSkills.userId)
          .eq('skill_id', skill.id)
          .single()
        
        if (!existing) {
          await supabase
            .from('user_skills')
            .insert({
              user_id: userSkills.userId,
              skill_id: skill.id,
              proficiency_level: 'ADVANCED',
              years_experience: Math.floor(Math.random() * 5) + 2
            })
        }
      }
    }
  }
  
  console.log('✅ User skills assigned')
}

async function createJobPostings() {
  console.log('💼 Creating test job postings...')
  
  const createdJobs = []
  
  for (const template of JOB_TEMPLATES) {
    // Calculate posting date
    const postDate = new Date()
    postDate.setDate(postDate.getDate() - template.daysAgo)
    
    // Alternate between recruiters for job postings
    const posterId = Math.random() > 0.5 ? TEST_USERS.recruiter1?.id : TEST_USERS.recruiter2?.id
    
    if (!posterId) {
      console.error('No recruiter found to post jobs')
      continue
    }
    
    const jobData = {
      title: template.title,
      description: template.description,
      company: template.company,
      location: template.location,
      is_remote: template.is_remote,
      job_type: template.job_type,
      hourly_rate_min: template.hourly_rate_min,
      hourly_rate_max: template.hourly_rate_max,
      currency: template.currency,
      contract_duration: template.contract_duration,
      hours_per_week: template.hours_per_week,
      experience_level: template.experience_level,
      requirements: template.requirements,
      is_active: template.is_active !== false,
      poster_id: posterId,
      created_at: postDate.toISOString(),
      updated_at: postDate.toISOString(),
      view_count: Math.floor(Math.random() * 100),
      application_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
    
    const { data: job, error } = await supabase
      .from('jobs')
      .insert(jobData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating job:', error)
      continue
    }
    
    createdJobs.push({ ...job, skills: template.skills })
    
    // Add job skills
    for (const skillName of template.skills) {
      const { data: skill } = await supabase
        .from('skills')
        .select('id')
        .eq('name', skillName)
        .single()
      
      if (skill) {
        await supabase
          .from('job_skills')
          .insert({
            job_id: job.id,
            skill_id: skill.id,
            is_required: true
          })
      }
    }
    
    console.log(`✅ Created job: ${template.title} (${template.daysAgo} days ago)`)
  }
  
  return createdJobs
}

async function createApplications(jobs) {
  console.log('📨 Creating test applications...')
  
  // Create some applications to test status updates
  const applications = [
    {
      job: jobs.find(j => j.title.includes('React')),
      applicant: TEST_USERS.contractor1,
      status: 'PENDING',
      cover_letter: 'I am very interested in this React position.',
      expected_rate: 95
    },
    {
      job: jobs.find(j => j.title.includes('Python')),
      applicant: TEST_USERS.contractor2,
      status: 'INTERVIEW',
      cover_letter: 'My Python and AWS experience makes me a great fit.',
      expected_rate: 110
    },
    {
      job: jobs.find(j => j.title.includes('DevOps')),
      applicant: TEST_USERS.contractor2,
      status: 'PENDING',
      cover_letter: 'I have extensive DevOps experience.',
      expected_rate: 120
    }
  ]
  
  for (const app of applications) {
    if (!app.job || !app.applicant) continue
    
    const { error } = await supabase
      .from('job_applications')
      .insert({
        job_id: app.job.id,
        applicant_id: app.applicant.id,
        status: app.status,
        cover_letter: app.cover_letter,
        expected_rate: app.expected_rate,
        availability_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
    
    if (error) {
      console.error('Error creating application:', error)
    } else {
      console.log(`✅ Created application: ${app.applicant.name} -> ${app.job.title} (${app.status})`)
    }
  }
}

async function createJobClicks(jobs) {
  console.log('📊 Creating test job clicks for analytics...')
  
  // Simulate clicks on jobs for recruiter analytics
  for (const job of jobs.slice(0, 5)) { // Only recent jobs
    const clickCount = Math.floor(Math.random() * 20) + 5
    
    for (let i = 0; i < clickCount; i++) {
      const clickDate = new Date()
      clickDate.setDate(clickDate.getDate() - Math.floor(Math.random() * 7))
      
      // Generate example external URLs for the companies
      const externalUrls = [
        'https://techcorp-solutions.com/careers',
        'https://cloudscale.com/jobs',
        'https://startupxyz.io/careers',
        'https://enterprise-systems.com/jobs',
        'https://api-masters.dev/careers'
      ]
      
      const { error } = await supabase
        .from('job_external_link_clicks')
        .insert({
          job_id: job.id,
          external_url: externalUrls[Math.floor(Math.random() * externalUrls.length)],
          ip_address: null, // Using null instead of invalid IP format
          user_agent: 'Mozilla/5.0 Test Browser',
          referrer_url: Math.random() > 0.5 ? 'https://google.com' : 'https://linkedin.com',
          clicked_at: clickDate.toISOString()
        })
      
      if (error) {
        console.error('Error creating job click:', error)
      }
    }
  }
  
  console.log('✅ Created test job clicks')
}

async function main() {
  console.log('🚀 Starting test data seeding for notification testing...\n')
  
  try {
    // Setup test users
    const usersReady = await setupTestUsers()
    if (!usersReady) {
      console.error('Failed to setup users')
      return
    }
    
    // Setup skills and user skills
    await setupSkills()
    
    // Create job postings with various dates
    const jobs = await createJobPostings()
    console.log(`✅ Created ${jobs.length} test jobs\n`)
    
    // Create applications
    await createApplications(jobs)
    
    // Create job clicks for analytics
    await createJobClicks(jobs)
    
    console.log('\n✨ Test data seeding complete!\n')
    console.log('📧 Test Users Created:')
    console.log('  Contractors:')
    console.log(`    - ${TEST_USERS.contractor1?.email} (React, TypeScript, Next.js skills)`)
    console.log(`    - ${TEST_USERS.contractor2?.email} (AWS, Docker, Python skills)`)
    console.log('  Recruiters:')
    console.log(`    - ${TEST_USERS.recruiter1?.email}`)
    console.log(`    - ${TEST_USERS.recruiter2?.email}`)
    
    console.log('\n📊 Data Summary:')
    console.log(`  - ${JOB_TEMPLATES.filter(j => j.daysAgo === 0).length} jobs posted today`)
    console.log(`  - ${JOB_TEMPLATES.filter(j => j.daysAgo > 0 && j.daysAgo <= 7).length} jobs posted this week`)
    console.log(`  - ${JOB_TEMPLATES.filter(j => j.daysAgo > 7 && j.daysAgo <= 14).length} jobs posted last week`)
    console.log(`  - ${JOB_TEMPLATES.filter(j => j.daysAgo > 14).length} older jobs (should not appear in weekly digest)`)
    
    console.log('\n🧪 Ready for testing! Use the test-notifications.js script to trigger emails.')
    
  } catch (error) {
    console.error('❌ Error seeding test data:', error)
  }
  
  process.exit(0)
}

// Run the seeder
main()