# 🚨 CRITICAL DATABASE MIGRATION REQUIRED

## The Issue
OAuth login fails because the `users` table has Row Level Security (RLS) enabled but is **missing the INSERT policy**. This prevents new users from being created during OAuth signup.

## Error Symptoms
- Google OAuth login succeeds but user creation fails
- Console errors: "Error creating/updating user: {}"
- Users are redirected to homepage with authentication errors

## Required Database Migration

**IMMEDIATELY run this SQL in your Supabase SQL Editor:**

```sql
-- Add missing INSERT policy for users table
CREATE POLICY "Users can insert own profile" ON users 
FOR INSERT WITH CHECK (auth.uid() = id);
```

## How to Apply

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Navigate to SQL Editor**
3. **Run the SQL above**
4. **Verify the policy was created**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'users' AND cmd = 'INSERT';
   ```

## Why This Happened
- The database schema had RLS enabled on the `users` table
- SELECT and UPDATE policies were created
- **INSERT policy was missing** - this is required for OAuth user creation
- New users couldn't be created because the database rejected INSERT operations

## Prevention
This issue is now prevented in future projects by:
- RLS policy templates that include ALL necessary policies (SELECT, INSERT, UPDATE, DELETE)
- Validation commands that check for missing INSERT policies
- Updated Claude configuration that makes RLS setup comprehensive and mandatory

## Testing After Migration
1. Clear browser cookies for localhost:3000
2. Try Google OAuth login again
3. Should successfully create user and redirect to dashboard
4. Check Supabase Auth users table to verify user was created

## File Created
The fix has been implemented in:
- `/root/contracts-only/database/schema.sql` (updated with correct policies)
- `/root/contracts-only/database/migrations/add_users_insert_policy.sql` (migration file)

**This migration file can be applied in Supabase SQL Editor to fix the immediate issue.**