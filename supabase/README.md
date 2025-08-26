# Supabase Database Migrations

This directory contains all database migrations for the ContractsOnly application.

## Migration Files

### 20240816_initial_schema.sql
- Creates all core tables: users, jobs, job_applications, skills, etc.
- Defines custom PostgreSQL types (enums)
- Sets up Row Level Security (RLS) policies for all tables
- Creates performance indexes
- Inserts initial skills data

### 20240816_add_users_insert_policy.sql
- Adds the missing INSERT policy for the users table
- Fixes OAuth login issue where new users cannot be created
- Required for proper user registration flow

### 20240825_add_click_tracking_tables.sql
- Adds external URL tracking fields to jobs table
- Adds recruiter notification preferences to users table
- Creates job_external_link_clicks table for analytics
- Creates notification_queue table for async email processing
- Includes performance indexes for new tables

### 20240826_enable_rls_tracking_tables.sql
- Enables Row Level Security for click tracking tables
- Creates comprehensive security policies:
  - Anonymous users can insert click tracking data
  - Job posters can view their own job analytics
  - Users can only see their own notifications
  - Service role has full access for automated processes

## Migration Order

These migrations should be applied in chronological order based on their prefixes:

1. `20240816_initial_schema.sql` - Core database structure
2. `20240816_add_users_insert_policy.sql` - User registration fix
3. `20240825_add_click_tracking_tables.sql` - Analytics features
4. `20240826_enable_rls_tracking_tables.sql` - Security policies

## Security Features

All tables have Row Level Security (RLS) enabled with appropriate policies:
- Users can only access their own data
- Job posters can manage their own job postings
- Anonymous click tracking is supported for analytics
- Service role has system-level access for automated processes

## Performance

Database includes optimized indexes for:
- Job search and filtering
- User profile lookups
- Application management
- Click analytics
- Notification processing

## Notes

- All timestamps use `TIMESTAMPTZ` for proper timezone handling
- UUIDs are used for all primary keys
- Foreign key constraints ensure data integrity
- Triggers automatically update `updated_at` fields