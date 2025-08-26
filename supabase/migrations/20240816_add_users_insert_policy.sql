-- Add missing INSERT policy for users table
-- This fixes the OAuth login issue where new users cannot be created

CREATE POLICY "Users can insert own profile" ON users 
FOR INSERT WITH CHECK (auth.uid() = id);