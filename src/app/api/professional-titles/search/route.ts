import { NextRequest, NextResponse } from 'next/server'

// Curated list of professional titles - in production this could be replaced with MyCru.io API
const professionalTitles = [
  // Technology & Software Development
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Mobile App Developer',
  'iOS Developer',
  'Android Developer',
  'React Developer',
  'Angular Developer',
  'Vue.js Developer',
  'Node.js Developer',
  'Python Developer',
  'Java Developer',
  '.NET Developer',
  'PHP Developer',
  'Ruby Developer',
  'Go Developer',
  'Rust Developer',
  'C++ Developer',
  'C# Developer',
  'JavaScript Developer',
  'TypeScript Developer',
  'Web Developer',
  'UI Developer',
  'UX Developer',
  'DevOps Engineer',
  'Cloud Engineer',
  'AWS Engineer',
  'Azure Engineer',
  'Google Cloud Engineer',
  'Site Reliability Engineer',
  'Platform Engineer',
  'Infrastructure Engineer',
  'Systems Engineer',
  'Network Engineer',
  'Security Engineer',
  'Cybersecurity Engineer',
  'Database Administrator',
  'Database Developer',
  'Data Engineer',
  'Data Scientist',
  'Data Analyst',
  'Machine Learning Engineer',
  'AI Engineer',
  'Blockchain Developer',
  'Smart Contract Developer',
  'Game Developer',
  'Unity Developer',
  'Unreal Engine Developer',
  'Quality Assurance Engineer',
  'Test Automation Engineer',
  'QA Tester',
  'Software Tester',
  'Technical Lead',
  'Team Lead',
  'Engineering Manager',
  'CTO',
  'VP of Engineering',
  'Head of Engineering',
  'Software Architect',
  'Solutions Architect',
  'Cloud Architect',
  'Data Architect',
  'Enterprise Architect',

  // Design & Creative
  'UI/UX Designer',
  'UX Designer',
  'UI Designer',
  'Product Designer',
  'Visual Designer',
  'Web Designer',
  'Graphic Designer',
  'Brand Designer',
  'Logo Designer',
  'Illustration Designer',
  'Motion Graphics Designer',
  'Video Editor',
  '3D Artist',
  '3D Modeler',
  'Game Artist',
  'Concept Artist',
  'Character Artist',
  'Environment Artist',
  'Animation Artist',
  'VFX Artist',
  'Creative Director',
  'Art Director',
  'Design Director',
  'Head of Design',

  // Marketing & Sales
  'Digital Marketing Specialist',
  'Content Marketing Specialist',
  'Social Media Manager',
  'Social Media Specialist',
  'SEO Specialist',
  'SEM Specialist',
  'PPC Specialist',
  'Email Marketing Specialist',
  'Marketing Manager',
  'Growth Marketing Manager',
  'Product Marketing Manager',
  'Brand Manager',
  'Community Manager',
  'Influencer Marketing Manager',
  'Affiliate Marketing Manager',
  'Marketing Analyst',
  'Marketing Coordinator',
  'Campaign Manager',
  'Advertising Manager',
  'Media Buyer',
  'Marketing Director',
  'VP of Marketing',
  'Head of Marketing',
  'CMO',
  'Sales Representative',
  'Sales Executive',
  'Account Executive',
  'Business Development Representative',
  'Sales Development Representative',
  'Account Manager',
  'Customer Success Manager',
  'Sales Manager',
  'Regional Sales Manager',
  'VP of Sales',
  'Head of Sales',
  'Chief Revenue Officer',

  // Business & Strategy
  'Business Analyst',
  'Product Manager',
  'Senior Product Manager',
  'Principal Product Manager',
  'VP of Product',
  'Head of Product',
  'Chief Product Officer',
  'Project Manager',
  'Program Manager',
  'Scrum Master',
  'Agile Coach',
  'Product Owner',
  'Business Consultant',
  'Management Consultant',
  'Strategy Consultant',
  'Operations Manager',
  'Operations Analyst',
  'Supply Chain Manager',
  'Logistics Manager',
  'Business Development Manager',
  'Partnership Manager',
  'Corporate Development Manager',
  'Chief Operating Officer',
  'General Manager',
  'CEO',
  'Founder',
  'Co-Founder',
  'Entrepreneur',

  // Finance & Accounting
  'Financial Analyst',
  'Senior Financial Analyst',
  'Investment Analyst',
  'Credit Analyst',
  'Budget Analyst',
  'Accountant',
  'Senior Accountant',
  'Staff Accountant',
  'Bookkeeper',
  'Auditor',
  'Tax Specialist',
  'Payroll Specialist',
  'Financial Controller',
  'Finance Manager',
  'Accounting Manager',
  'Treasury Manager',
  'Risk Manager',
  'Compliance Manager',
  'CFO',
  'VP of Finance',
  'Head of Finance',
  'Investment Manager',
  'Portfolio Manager',
  'Financial Planner',
  'Financial Advisor',

  // Human Resources
  'HR Specialist',
  'HR Generalist',
  'HR Manager',
  'HR Director',
  'VP of HR',
  'Head of HR',
  'Chief People Officer',
  'Recruiter',
  'Senior Recruiter',
  'Technical Recruiter',
  'Executive Recruiter',
  'Talent Acquisition Manager',
  'Talent Acquisition Specialist',
  'HR Business Partner',
  'Compensation Analyst',
  'Benefits Administrator',
  'Training Specialist',
  'Learning and Development Manager',
  'Organizational Development Manager',
  'Employee Relations Manager',

  // Customer Service & Support
  'Customer Service Representative',
  'Customer Support Specialist',
  'Technical Support Specialist',
  'Help Desk Technician',
  'Customer Success Specialist',
  'Customer Experience Manager',
  'Support Manager',
  'Call Center Manager',
  'Customer Service Manager',

  // Legal & Compliance
  'Lawyer',
  'Attorney',
  'Legal Counsel',
  'Corporate Lawyer',
  'Contract Attorney',
  'Paralegal',
  'Legal Assistant',
  'Compliance Officer',
  'Legal Manager',
  'General Counsel',
  'Chief Legal Officer',

  // Healthcare & Medical
  'Software Developer (Healthcare)',
  'Healthcare IT Specialist',
  'Medical Device Engineer',
  'Biomedical Engineer',
  'Clinical Data Manager',
  'Healthcare Analyst',
  'Medical Writer',
  'Regulatory Affairs Specialist',
  'Quality Assurance (Medical)',
  'Healthcare Consultant',

  // Education & Training
  'Instructional Designer',
  'E-learning Developer',
  'Training Specialist',
  'Corporate Trainer',
  'Educational Consultant',
  'Curriculum Developer',
  'Technical Writer',
  'Documentation Specialist',
  'Content Developer',

  // Operations & Administration
  'Administrative Assistant',
  'Executive Assistant',
  'Office Manager',
  'Operations Coordinator',
  'Project Coordinator',
  'Data Entry Specialist',
  'Research Assistant',
  'Market Research Analyst',
  'Business Intelligence Analyst',
  'Process Improvement Specialist',

  // Freelance & Consulting Specific
  'Freelance Developer',
  'Independent Contractor',
  'Consultant',
  'Freelance Designer',
  'Freelance Writer',
  'Freelance Marketer',
  'Contract Developer',
  'Remote Developer',
  'Contract Designer',
  'Contract Analyst',
  'Contract Manager',
  'Virtual Assistant',
  'Online Tutor',
  'Content Creator',
  'Copywriter',
  'Technical Copywriter',
  'Grant Writer',
  'Proposal Writer',
  'Editor',
  'Proofreader',
  'Translator',
  'Interpreter',
  'Voice Over Artist',
  'Photographer',
  'Videographer',
  'Event Planner',
  'Social Media Freelancer'
]

// Simple in-memory cache to avoid repeated filtering
const titleCache = new Map<string, string[]>()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim().toLowerCase()
    
    if (!query || query.length < 2) {
      return NextResponse.json({ titles: [] })
    }
    
    // Check cache
    const cacheKey = query
    const cached = titleCache.get(cacheKey)
    if (cached) {
      return NextResponse.json({ titles: cached })
    }
    
    // Filter titles based on query
    const filteredTitles = professionalTitles
      .filter(title => 
        title.toLowerCase().includes(query)
      )
      .slice(0, 10) // Limit to 10 results for performance
      .sort((a, b) => {
        // Prioritize matches that start with the query
        const aStartsWith = a.toLowerCase().startsWith(query)
        const bStartsWith = b.toLowerCase().startsWith(query)
        
        if (aStartsWith && !bStartsWith) return -1
        if (!aStartsWith && bStartsWith) return 1
        
        // Then sort by relevance (shorter titles first for exact matches)
        const aExact = a.toLowerCase() === query
        const bExact = b.toLowerCase() === query
        
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        
        // Finally sort alphabetically
        return a.localeCompare(b)
      })
    
    // Cache the result
    titleCache.set(cacheKey, filteredTitles)
    
    // Clean up cache if it gets too large
    if (titleCache.size > 100) {
      const oldestKeys = Array.from(titleCache.keys()).slice(0, 50)
      oldestKeys.forEach(key => titleCache.delete(key))
    }
    
    return NextResponse.json({ titles: filteredTitles })
  } catch (error) {
    console.error('Professional titles search error:', error)
    return NextResponse.json(
      { error: 'Failed to search professional titles' }, 
      { status: 500 }
    )
  }
}