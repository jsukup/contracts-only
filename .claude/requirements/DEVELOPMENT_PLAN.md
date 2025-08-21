# Implementation Plan: ContractsOnly

## Development Environment Setup

### Prerequisites
```bash
# Required software
Node.js 18+ 
Git
PostgreSQL 14+
VS Code (recommended)

# Package manager
npm (comes with Node.js)
```

### Initial Setup Commands
```bash
# 1. Create project
npx create-next-app@latest contracts-only --typescript --tailwind --app --src-dir
cd contracts-only

# 2. Install core dependencies
npm install @supabase/supabase-js next-auth
npm install zod react-hook-form @hookform/resolvers
npm install zustand lucide-react date-fns
npm install @sendgrid/mail

# 3. Install dev dependencies
npm install -D @types/node @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D prettier eslint-config-prettier
npm install -D jest @testing-library/react @testing-library/jest-dom

# 4. Initialize Supabase
# Set up Supabase project at https://supabase.com
# Configure environment variables

# 5. Set up Git
git init
git add .
git commit -m "Initial commit"
```

## Development Workflow

### Daily Development Process
1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Database Development**
   ```bash
   # After schema changes
   # Database managed through Supabase Dashboard
   # Schema changes applied directly in Supabase
   
   # View data
   # Use Supabase Dashboard table editor
   ```

3. **Testing**
   ```bash
   # Run tests
   npm run test
   npm run test:watch
   
   # Type checking
   npm run type-check
   
   # Linting
   npm run lint
   ```

### Feature Development Pattern
1. Create database schema changes
2. Generate types and migrations
3. Build API routes
4. Create UI components
5. Write tests
6. Update documentation

## Architecture Implementation

### Project Structure
```
src/
├── app/                    # Next.js 15 App Router
│   ├── (auth)/            # Auth route group
│   ├── api/               # API routes
│   ├── dashboard/         # Protected dashboard
│   ├── jobs/              # Job listing pages
│   ├── companies/         # Company pages
│   ├── contractors/       # Contractor pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── components/            # Reusable components
│   ├── ui/               # Base UI components
│   ├── forms/            # Form components
│   ├── job/              # Job-related components
│   └── layout/           # Layout components
├── lib/                  # Utility libraries
│   ├── auth.ts           # NextAuth config
│   ├── db.ts             # Database connection
│   ├── email.ts          # Email service
│   ├── utils.ts          # General utilities
│   └── validations.ts    # Zod schemas
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
└── utils/                # Helper functions
```

### Database Schema Implementation

```sql
-- Database schema managed in Supabase Dashboard
-- See database/schema.sql for the complete Supabase schema
-- Tables use snake_case naming convention with Row Level Security policies


```

## API Design

### REST API Endpoints

```typescript
// Authentication
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/session

// User Profiles
GET    /api/profile
PUT    /api/profile
DELETE /api/profile

// Contractor Profiles
GET    /api/contractors
GET    /api/contractors/[id]
PUT    /api/contractors/[id]

// Companies
GET    /api/companies
GET    /api/companies/[id]
PUT    /api/companies/[id]
POST   /api/companies

// Jobs
GET    /api/jobs              // Search & filter
GET    /api/jobs/[id]
POST   /api/jobs
PUT    /api/jobs/[id]
DELETE /api/jobs/[id]
POST   /api/jobs/[id]/apply   // Track application

// Reviews
GET    /api/reviews
POST   /api/reviews
GET    /api/reviews/[id]

// Matching
GET    /api/matches/jobs      // For contractors
GET    /api/matches/contractors // For employers

// Notifications
GET    /api/notifications
PUT    /api/notifications/preferences
POST   /api/notifications/send

// Analytics
GET    /api/analytics/jobs
GET    /api/analytics/applications

// Future: Bulk Import (Placeholder)
POST   /api/jobs/bulk-import  // Feature flagged
```

### Example API Implementation

```typescript
// app/api/jobs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { jobSearchSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const searchParams = Object.fromEntries(url.searchParams)
    
    const {
      q,
      minRate,
      maxRate,
      contractType,
      duration,
      remote,
      page = '1',
      limit = '20'
    } = jobSearchSchema.parse(searchParams)

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const jobs = await db.job.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
        ...(q && {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { skillsRequired: { hasSome: [q] } }
          ]
        }),
        ...(minRate && { hourlyRateMin: { gte: parseInt(minRate) } }),
        ...(maxRate && { hourlyRateMax: { lte: parseInt(maxRate) } }),
        ...(contractType && { contractType }),
        ...(duration && { contractDuration: duration }),
        ...(remote && { remoteType: remote })
      },
      include: {
        company: true
      },
      skip,
      take: parseInt(limit),
      orderBy: { postedAt: 'desc' }
    })

    const total = await db.job.count({
      where: {
        status: 'ACTIVE',
        expiresAt: { gt: new Date() }
      }
    })

    return NextResponse.json({
      jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('Job search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const jobData = jobCreateSchema.parse(body)

    const job = await db.job.create({
      data: {
        ...jobData,
        companyId: session.user.companyId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      },
      include: {
        company: true
      }
    })

    // Trigger job matching algorithm
    await triggerJobMatching(job.id)

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error('Job creation error:', error)
    return NextResponse.json(
      { error: 'Invalid job data' },
      { status: 400 }
    )
  }
}
```

## Component Library

### Base Components

```typescript
// components/ui/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'underline-offset-4 hover:underline text-primary'
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)

export { Button, buttonVariants }
```

### Job Components

```typescript
// components/job/JobCard.tsx
import { Job, Company } from '@/lib/types'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface JobCardProps {
  job: Job & { company: Company }
  onApply?: (jobId: string) => void
}

export function JobCard({ job, onApply }: JobCardProps) {
  const handleApply = () => {
    // Track application click
    fetch(`/api/jobs/${job.id}/apply`, { method: 'POST' })
    // Redirect to external URL
    window.open(job.applicationUrl, '_blank')
    onApply?.(job.id)
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold">{job.title}</h3>
            <p className="text-sm text-muted-foreground">{job.company.name}</p>
          </div>
          {job.urgent && <Badge variant="destructive">Urgent</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm line-clamp-3">{job.description}</p>
          
          <div className="flex flex-wrap gap-2">
            {job.skillsRequired.map((skill) => (
              <Badge key={skill} variant="secondary">{skill}</Badge>
            ))}
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              <p>${job.hourlyRateMin}-${job.hourlyRateMax}/hr</p>
              <p>{job.contractDuration} • {job.remoteType}</p>
            </div>
            <Button onClick={handleApply}>Apply Now</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

## Testing Strategy

### Test Setup

```typescript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
}

module.exports = createJestConfig(customJestConfig)
```

### Example Tests

```typescript
// __tests__/components/JobCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { JobCard } from '@/components/job/JobCard'

const mockJob = {
  id: '1',
  title: 'Frontend Developer',
  description: 'React developer needed',
  hourlyRateMin: 50,
  hourlyRateMax: 80,
  skillsRequired: ['React', 'TypeScript'],
  contractDuration: 'MEDIUM_TERM',
  remoteType: 'REMOTE',
  applicationUrl: 'https://example.com/apply',
  urgent: false,
  company: {
    name: 'Tech Corp'
  }
}

describe('JobCard', () => {
  it('renders job information correctly', () => {
    render(<JobCard job={mockJob} />)
    
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument()
    expect(screen.getByText('Tech Corp')).toBeInTheDocument()
    expect(screen.getByText('$50-$80/hr')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
  })

  it('calls onApply when Apply Now is clicked', () => {
    const onApply = jest.fn()
    render(<JobCard job={mockJob} onApply={onApply} />)
    
    fireEvent.click(screen.getByText('Apply Now'))
    expect(onApply).toHaveBeenCalledWith('1')
  })
})
```

## Deployment Strategy

### Environment Configuration

```bash
# .env.local (development)
DATABASE_URL="postgresql://user:password@localhost:5432/contracts_only_dev"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

SENDGRID_API_KEY="your-sendgrid-api-key"
FROM_EMAIL="noreply@contractsonly.com"

ENABLE_BULK_IMPORT=false
```

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Set environment variables
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
```

### Database Migration for Production

```bash
# Generate migration
# Deploy database changes
# Apply schema changes via Supabase Dashboard

# Seed production data
# Use Supabase SQL editor or custom seeding scripts
```

## Performance Monitoring

### Analytics Setup

```typescript
// lib/analytics.ts
import { track } from '@vercel/analytics'

export const trackJobView = (jobId: string) => {
  track('job_view', { jobId })
}

export const trackJobApplication = (jobId: string, source: string) => {
  track('job_application', { jobId, source })
}

export const trackProfileView = (profileId: string, viewerType: string) => {
  track('profile_view', { profileId, viewerType })
}
```

### Error Monitoring

```typescript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
})

export { Sentry }
```

## Success Validation Criteria

### Technical Validation
- [ ] All pages load in < 2 seconds
- [ ] Search returns results in < 500ms
- [ ] Mobile responsive on all devices
- [ ] 99%+ Lighthouse performance score
- [ ] No console errors in production

### Feature Validation  
- [ ] User can register and create profile
- [ ] Company can post job successfully
- [ ] Contractor receives job match notifications
- [ ] Job search and filtering works accurately
- [ ] Reviews can be submitted and displayed
- [ ] External application tracking works

### Security Validation
- [ ] All forms use CSRF protection
- [ ] SQL injection prevented by Supabase RLS policies
- [ ] XSS protection via React escaping
- [ ] Rate limiting on API endpoints
- [ ] Secure session management

### Business Validation
- [ ] Job posting flow is intuitive
- [ ] Contractor profiles showcase skills effectively
- [ ] Matching algorithm provides relevant results
- [ ] Email notifications are delivered
- [ ] Analytics track key user actions