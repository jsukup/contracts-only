// Custom types for Supabase database operations

export enum EmailType {
  JOB_APPLICATION_NOTIFICATION = 'JOB_APPLICATION_NOTIFICATION',
  JOB_POSTING_CONFIRMATION = 'JOB_POSTING_CONFIRMATION',
  WEEKLY_DIGEST = 'WEEKLY_DIGEST',
  APPLICATION_STATUS_UPDATE = 'APPLICATION_STATUS_UPDATE'
}

export enum EmailJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  FAILED = 'FAILED'
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  RECRUITER = 'RECRUITER'
}

export enum JobType {
  CONTRACT = 'CONTRACT',
  FREELANCE = 'FREELANCE',
  PART_TIME = 'PART_TIME',
  FULL_TIME = 'FULL_TIME'
}

export enum ApplicationStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  INTERVIEW = 'INTERVIEW',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED'
}

export enum AvailabilityStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  UNAVAILABLE = 'UNAVAILABLE'
}

export enum ProficiencyLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT'
}

export enum ExperienceLevel {
  JUNIOR = 'JUNIOR',
  MID = 'MID',
  SENIOR = 'SENIOR',
  LEAD = 'LEAD'
}

// Extended types for complex operations
export interface JobWithIncludes {
  id: string
  title: string
  description: string
  company: string
  location: string | null
  is_remote: boolean
  job_type: JobType
  hourly_rate_min: number
  hourly_rate_max: number
  currency: string
  contract_duration: string | null
  hours_per_week: number | null
  start_date: string | null
  requirements: string | null
  is_active: boolean
  is_featured: boolean
  featured_until: string | null
  poster_id: string
  created_at: string
  updated_at: string
  application_deadline: string | null
  view_count: number
  experience_level: ExperienceLevel
  // Optional includes
  user?: {
    id: string
    name: string | null
    email: string
    companyName?: string | null
  }
  skills?: Array<{
    id: string
    name: string
  }>
  jobSkills?: Array<{
    id: string
    job_id: string
    skill_id: string
    is_required: boolean
    skill: {
      name: string
    }
  }>
  _count?: {
    applications: number
  }
}

export interface UserWithIncludes {
  id: string
  email: string
  email_verified: string | null
  name: string | null
  image: string | null
  role: UserRole
  created_at: string
  updated_at: string
  title: string | null
  bio: string | null
  location: string | null
  website: string | null
  linkedin_url: string | null
  hourly_rate_min: number | null
  hourly_rate_max: number | null
  availability: AvailabilityStatus
  job_alerts_enabled: boolean
  desired_rate_min: number | null
  desired_rate_max: number | null
  // Optional includes
  userSkills?: Array<{
    id: string
    user_id: string
    skill_id: string
    proficiency_level: ProficiencyLevel
    years_experience: number | null
    created_at: string
    skill: {
      id: string
      name: string
      category: string
    }
  }>
  skills?: Array<{
    id: string
    name: string
    category: string
  }>
}

export interface ApplicationWithIncludes {
  id: string
  job_id: string
  applicant_id: string
  status: ApplicationStatus
  cover_letter: string | null
  resume_url: string | null
  expected_rate: number | null
  availability_date: string | null
  created_at: string
  updated_at: string
  // Optional includes
  job?: JobWithIncludes
  applicant?: UserWithIncludes
}

// Email job types
export interface EmailJob {
  id: string
  recipient_id: string
  job_id: string | null
  email_type: string
  sent_at: string
  opened_at: string | null
  clicked_at: string | null
}

// Analytics result types
export interface RateDistributionResult {
  range: string
  count: number
}

export interface SkillDistributionResult {
  skill: string
  count: number
}

export interface JobCategoryResult {
  category: string
  count: number
}

export interface LocationDistributionResult {
  location: string
  count: number
}

export interface UserGrowthResult {
  date: string
  count: number
}

// Complex filter types for advanced queries
export interface DateRangeFilter {
  start: Date
  end: Date
}

export interface RateRangeFilter {
  min?: number
  max?: number
}

export interface TextSearchFilter {
  term: string
  fields?: string[]
}

export interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}

export interface PaginationOptions {
  page: number
  limit: number
}

// API response types
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Database aggregate result types
export interface AggregateResult {
  _avg?: {
    [key: string]: number | null
  }
  _count?: {
    [key: string]: number
  }
  _sum?: {
    [key: string]: number | null
  }
  _max?: {
    [key: string]: number | string | Date | null
  }
  _min?: {
    [key: string]: number | string | Date | null
  }
}

export interface GroupByResult {
  [key: string]: string | number | Date | null
  _count: {
    [key: string]: number
  }
}