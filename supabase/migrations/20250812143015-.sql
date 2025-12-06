-- Completely lock down the advisory_team_members table
-- First, drop any existing policies
DROP POLICY IF EXISTS "admin_only_table_access" ON advisory_team_members;
DROP POLICY IF EXISTS "admin_only_full_access" ON advisory_team_members;

-- Disable RLS temporarily to ensure clean state
ALTER TABLE advisory_team_members DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with a single, strict admin-only policy
ALTER TABLE advisory_team_members ENABLE ROW LEVEL SECURITY;

-- Create the most restrictive policy possible - ONLY admins can access ANY data
CREATE POLICY "strict_admin_only_access" 
ON advisory_team_members 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'Admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'Admin'
  )
);

-- Drop any functions that might provide unauthorized access
DROP FUNCTION IF EXISTS public.get_advisory_team_members_public();
DROP FUNCTION IF EXISTS public.get_advisory_team_members_basic();
DROP FUNCTION IF EXISTS public.get_public_team_members();
DROP FUNCTION IF EXISTS public.get_team_members_safe();

-- Create a single, secure function for basic team member info (no sensitive data)
CREATE OR REPLACE FUNCTION public.get_team_members_basic_info()
RETURNS TABLE(id uuid, name text, title text, designation text, advisory_services text[], expertise text[], is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only authenticated users can access basic info
  -- Absolutely NO email addresses, rates, or user_ids
  IF auth.uid() IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      atm.id,
      atm.name,
      atm.title,
      atm.designation,
      atm.advisory_services,
      atm.expertise,
      atm.is_active
    FROM advisory_team_members atm
    WHERE atm.is_active = true;
  END IF;
END;
$$;

-- Admin-only function for full access (the ONLY way to access sensitive data)
CREATE OR REPLACE FUNCTION public.admin_get_all_team_members()
RETURNS TABLE(id uuid, user_id uuid, name text, title text, designation text, email text, advisory_services text[], expertise text[], rate_per_hour numeric, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Verify admin role
  SELECT role INTO current_user_role 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- ONLY admins can access sensitive data
  IF current_user_role = 'Admin' THEN
    RETURN QUERY
    SELECT 
      atm.id,
      atm.user_id,
      atm.name,
      atm.title,
      atm.designation,
      atm.email,
      atm.advisory_services,
      atm.expertise,
      atm.rate_per_hour,
      atm.is_active,
      atm.created_at,
      atm.updated_at
    FROM advisory_team_members atm;
  ELSE
    -- Return nothing for non-admins
    RETURN;
  END IF;
END;
$$;