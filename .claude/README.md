# ContractsOnly Project Claude Configuration

This directory contains the Claude Code configuration specific to the ContractsOnly project.

## Directory Structure

```
.claude/
├── requirements/          # Project PRD and documentation
│   ├── PRD.md            # Main Product Requirements Document
│   ├── IMPLEMENTATION.md  # Task breakdown with automation indicators
│   ├── DEVELOPMENT_PLAN.md # Step-by-step development plan
│   ├── metadata.json     # Project metadata and configuration
│   └── history/          # Complete requirements gathering history
│       ├── 00-initial-request.md
│       ├── 01-example-analysis.md
│       ├── 02-discovery-questions.md
│       ├── 03-discovery-answers.md
│       ├── 04-context-findings.md
│       ├── 05-detail-questions.md
│       ├── 06-detail-answers.md
│       ├── 07-requirements-spec.md
│       ├── 08-task-breakdown.md
│       ├── 09-implementation-plan.md
│       └── 10-comprehensive-prd.md
├── status/               # Implementation tracking
│   ├── .claude-project-info.json      # Project information
│   └── .claude-implementation-status.json # Current implementation status
└── config/               # Project-specific configuration (future use)
```

## Key Files

### PRD.md
The main Product Requirements Document containing:
- Executive summary and vision
- Problem statement and business case
- User stories and personas
- Technical architecture
- Implementation requirements
- Success metrics

### IMPLEMENTATION.md
Detailed task breakdown including:
- Hierarchical task structure
- Automation indicators (✅ autonomous, ⚠️ needs approval, 🛑 manual)
- Dependencies between tasks
- Executable command sequences

### DEVELOPMENT_PLAN.md
Step-by-step implementation guide with:
- Environment setup
- Development phases
- Testing strategy
- Deployment checklist

## Working with This Project

### Continue Implementation
From the project directory, run:
```bash
/implementation-status  # Check current progress
/project-implement      # Continue autonomous tasks
```

### Update Requirements
To add new features or requirements:
```bash
/requirements-start "new feature description"
/requirements-status    # Check progress
/requirements-end       # Generate updated PRD
```

### View Documentation
```bash
cat .claude/requirements/PRD.md            # View main PRD
cat .claude/requirements/IMPLEMENTATION.md  # View tasks
cat .claude/status/.claude-implementation-status.json # Check status
```

## Project Information

- **Project Name:** ContractsOnly
- **Type:** Web Application (Job Board Platform)
- **Tech Stack:**
  - Frontend: Next.js 15, React, Tailwind CSS
  - Backend: Next.js API Routes
  - Database: Supabase PostgreSQL
  - Auth: NextAuth.js with Google OAuth
  - Deployment: Vercel

## Current Status

The project has completed initial setup with:
- ✅ Database schema created and deployed
- ✅ Authentication system configured
- ✅ Project structure established
- ✅ Development environment ready

Next steps are documented in IMPLEMENTATION.md.

## Global Claude Configuration

This project configuration works alongside the global Claude configuration at `/root/.claude/`. Global templates, workflows, and commands are still accessible while maintaining project-specific requirements and status locally.