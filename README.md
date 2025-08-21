# ContractsOnly

A job board platform specifically designed for short-term contract work with hourly rate transparency.

## 🎯 Project Overview

ContractsOnly connects businesses with contractors for short-term projects, featuring transparent hourly rates and streamlined application processes. Built for the modern remote workforce.

### Key Features

- **Transparent Pricing**: All jobs display hourly rate ranges upfront
- **Contract Focus**: Specialized for short-term contract positions
- **Global Remote Work**: Support for worldwide remote opportunities
- **Simple Applications**: Direct external links to company application processes
- **Skills Matching**: Advanced filtering by skills and rate expectations

## 🛠️ Technology Stack

- **Frontend**: Next.js 15 with React and TypeScript
- **Styling**: Tailwind CSS with Radix UI components
- **Database**: Supabase PostgreSQL with Supabase SDK
- **Authentication**: NextAuth.js with Google and LinkedIn OAuth
- **Payments**: Stripe (feature-flagged for October 2025)
- **Analytics**: Google Analytics 4 with privacy compliance
- **Deployment**: Vercel (free tier optimized)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL database (Supabase recommended)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Fill in your environment variables
   ```

4. Set up the database:
   ```bash
   # Database schema managed in Supabase Dashboard
   # Types generated automatically by Supabase CLI
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📋 Project Structure

```
├── src/
│   ├── app/              # Next.js 15 App Router
│   ├── components/       # Reusable UI components
│   ├── lib/             # Utilities and configurations
│   └── types/           # TypeScript type definitions
├── database/            # Supabase types and migrations
├── public/              # Static assets
├── PRD.md              # Product Requirements Document
├── IMPLEMENTATION.md    # Task breakdown and implementation guide
└── DEVELOPMENT_PLAN.md  # Step-by-step development plan
```

## 🎯 Development Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [x] Project initialization
- [x] Database schema design
- [ ] Authentication implementation
- [ ] Basic UI components

### Phase 2: Core Features (Weeks 3-4)
- [ ] Job listing and posting
- [ ] User profiles and skills
- [ ] Search and filtering
- [ ] Application tracking

### Phase 3: Enhancement (Weeks 5-6)
- [ ] Advanced search features
- [ ] Email notifications
- [ ] Analytics implementation
- [ ] Performance optimization

### Phase 4: Launch Preparation (Weeks 7-8)
- [ ] Testing and QA
- [ ] SEO optimization
- [ ] Documentation
- [ ] Deployment setup

## 💰 Business Model

**Free Period**: Until September 30, 2025 - All features available at no cost
**Monetization**: Starting October 2025 with job posting fees and premium features

Cost optimization through free tier usage (Vercel, Supabase) during launch period.

## 📄 Documentation

- [Product Requirements Document](./PRD.md)
- [Implementation Guide](./IMPLEMENTATION.md)
- [Development Plan](./DEVELOPMENT_PLAN.md)

## 🔧 Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with sample data
```

## 🤝 Contributing

This project follows the implementation plan outlined in the PRD. Check the IMPLEMENTATION.md file for detailed task breakdown and development guidelines.

---

*Generated with [Claude Code](https://claude.ai/code) from comprehensive PRD*
