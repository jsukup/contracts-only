-- ContractsOnly Database Schema for Supabase
-- Native PostgreSQL schema for direct use with Supabase

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom types (enums)
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN', 'RECRUITER');
CREATE TYPE availability_status AS ENUM ('AVAILABLE', 'BUSY', 'UNAVAILABLE');
CREATE TYPE job_type AS ENUM ('CONTRACT', 'FREELANCE', 'PART_TIME', 'FULL_TIME');
CREATE TYPE experience_level AS ENUM ('JUNIOR', 'MID', 'SENIOR', 'LEAD');
CREATE TYPE application_status AS ENUM ('PENDING', 'REVIEWED', 'INTERVIEW', 'ACCEPTED', 'REJECTED');
CREATE TYPE proficiency_level AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- Users table (extends auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  email_verified TIMESTAMPTZ,
  name TEXT,
  image TEXT,
  role user_role DEFAULT 'USER' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Profile information
  title TEXT,
  bio TEXT,
  location TEXT,
  website TEXT,
  linkedin_url TEXT,
  hourly_rate_min INTEGER,
  hourly_rate_max INTEGER,
  availability availability_status DEFAULT 'AVAILABLE' NOT NULL,
  
  -- Job preferences
  job_alerts_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  desired_rate_min INTEGER,
  desired_rate_max INTEGER
);

-- Jobs table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  is_remote BOOLEAN DEFAULT FALSE NOT NULL,
  job_type job_type DEFAULT 'CONTRACT' NOT NULL,
  
  -- Rate information
  hourly_rate_min INTEGER NOT NULL,
  hourly_rate_max INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,
  
  -- Job details
  contract_duration TEXT,
  hours_per_week INTEGER,
  start_date TIMESTAMPTZ,
  requirements TEXT,
  
  -- Job status
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  is_featured BOOLEAN DEFAULT FALSE NOT NULL,
  featured_until TIMESTAMPTZ,
  
  -- Metadata
  poster_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  application_deadline TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0 NOT NULL,
  experience_level experience_level DEFAULT 'MID' NOT NULL
);

-- Job applications table
CREATE TABLE job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status application_status DEFAULT 'PENDING' NOT NULL,
  cover_letter TEXT,
  resume_url TEXT,
  expected_rate INTEGER,
  availability_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(job_id, applicant_id) -- Prevent duplicate applications
);

-- Skills table
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- User skills (many-to-many relationship)
CREATE TABLE user_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency_level proficiency_level DEFAULT 'INTERMEDIATE' NOT NULL,
  years_experience INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, skill_id) -- Prevent duplicate skills per user
);

-- Job skills (many-to-many relationship)
CREATE TABLE job_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(job_id, skill_id) -- Prevent duplicate skills per job
);

-- Email jobs table (for tracking email campaigns)
CREATE TABLE email_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL, -- 'job_alert', 'job_match', etc.
  sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  UNIQUE(recipient_id, job_id, email_type) -- Prevent duplicate emails
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'job_application', 'job_match', 'system', etc.
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  related_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  related_application_id UUID REFERENCES job_applications(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Reviews table (for employer/contractor reviews)
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_public BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(reviewer_id, reviewee_id, job_id) -- One review per job relationship
);

-- Indexes for performance
CREATE INDEX idx_jobs_active ON jobs(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_jobs_featured ON jobs(is_featured, featured_until) WHERE is_featured = TRUE;
CREATE INDEX idx_jobs_location ON jobs(location) WHERE location IS NOT NULL;
CREATE INDEX idx_jobs_remote ON jobs(is_remote) WHERE is_remote = TRUE;
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_jobs_poster_id ON jobs(poster_id);

CREATE INDEX idx_applications_job_id ON job_applications(job_id);
CREATE INDEX idx_applications_applicant_id ON job_applications(applicant_id);
CREATE INDEX idx_applications_status ON job_applications(status);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_availability ON users(availability);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON job_applications FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile and update it
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Jobs are publicly readable, but only poster can modify
CREATE POLICY "Jobs are publicly readable" ON jobs FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Users can create jobs" ON jobs FOR INSERT WITH CHECK (auth.uid() = poster_id);
CREATE POLICY "Users can update own jobs" ON jobs FOR UPDATE USING (auth.uid() = poster_id);
CREATE POLICY "Users can delete own jobs" ON jobs FOR DELETE USING (auth.uid() = poster_id);

-- Job applications - users can see their own applications, job posters can see applications to their jobs
CREATE POLICY "Users can view own applications" ON job_applications FOR SELECT USING (
  auth.uid() = applicant_id OR 
  auth.uid() IN (SELECT poster_id FROM jobs WHERE id = job_applications.job_id)
);
CREATE POLICY "Users can create applications" ON job_applications FOR INSERT WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "Users can update own applications" ON job_applications FOR UPDATE USING (auth.uid() = applicant_id);
CREATE POLICY "Job posters can update application status" ON job_applications FOR UPDATE USING (
  auth.uid() IN (SELECT poster_id FROM jobs WHERE id = job_applications.job_id)
);

-- User skills - users can manage their own skills
CREATE POLICY "Users can manage own skills" ON user_skills FOR ALL USING (auth.uid() = user_id);

-- Notifications - users can only see their own
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Skills are publicly readable
CREATE POLICY "Skills are publicly readable" ON skills FOR SELECT TO authenticated USING (TRUE);

-- Reviews are publicly readable (if public), but users can only create/update their own
CREATE POLICY "Public reviews are readable" ON reviews FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = reviewer_id);

-- Insert some initial skills
INSERT INTO skills (name, category) VALUES
  ('JavaScript', 'Programming'),
  ('TypeScript', 'Programming'),
  ('React', 'Framework'),
  ('Next.js', 'Framework'),
  ('Node.js', 'Backend'),
  ('Python', 'Programming'),
  ('PostgreSQL', 'Database'),
  ('MongoDB', 'Database'),
  ('AWS', 'Cloud'),
  ('Docker', 'DevOps'),
  ('Git', 'Tools'),
  ('Figma', 'Design'),
  ('Adobe Creative Suite', 'Design'),
  ('Project Management', 'Management'),
  ('Agile', 'Methodology');