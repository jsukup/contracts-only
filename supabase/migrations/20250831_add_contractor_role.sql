-- Add CONTRACTOR role to user_role enum
-- This migration adds the CONTRACTOR role to the existing user_role enum
-- to properly distinguish between contractors and regular users

-- Add the new CONTRACTOR role to the enum
ALTER TYPE user_role ADD VALUE 'CONTRACTOR';

-- Note: PostgreSQL does not allow removing enum values in the same transaction
-- The 'USER' role will remain for backward compatibility but 'CONTRACTOR' should be used for contractors
-- The enum now contains: 'USER', 'ADMIN', 'RECRUITER', 'CONTRACTOR'

-- Future considerations:
-- - Update application logic to use 'CONTRACTOR' instead of 'USER' for contractors
-- - Consider migrating existing users with role 'USER' to 'CONTRACTOR' if they are contractors
-- - The 'USER' role can be kept for general/admin users or deprecated over time