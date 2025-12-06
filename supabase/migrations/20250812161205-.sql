-- Ensure all auth users have corresponding profiles with proper usernames
-- This will help fix the "Requested By" field showing IDs instead of names

-- First, let's create a function to extract username from email
CREATE OR REPLACE FUNCTION extract_username_from_email(email_address text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE 
    WHEN email_address IS NULL THEN 'User'
    WHEN position('@' in email_address) > 0 THEN 
      split_part(email_address, '@', 1)
    ELSE 
      email_address
  END;
$$;

-- Update existing profiles that have empty or null usernames
UPDATE profiles 
SET username = extract_username_from_email(email)
WHERE username IS NULL 
   OR username = '' 
   OR trim(username) = '';

-- Insert missing profiles for users who don't have profiles yet
-- This handles cases where auth users exist but profiles don't
INSERT INTO profiles (user_id, username, email, role, status)
SELECT 
  au.id as user_id,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'username', 
    extract_username_from_email(au.email),
    'User'
  ) as username,
  au.email,
  'Standard User' as role,
  'Active' as status
FROM auth.users au
LEFT JOIN profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL
  AND au.email IS NOT NULL;

-- Update profiles that still have generic usernames to use email-based usernames
UPDATE profiles 
SET username = extract_username_from_email(email)
WHERE username IN ('User', 'user', 'USER')
  AND email IS NOT NULL
  AND email != '';

-- Add a comment explaining this migration
COMMENT ON FUNCTION extract_username_from_email(text) IS 'Extracts a username from an email address by taking the part before @ symbol. Used to ensure all users have meaningful display names.';