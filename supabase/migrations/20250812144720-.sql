-- Emergency fix for infinite recursion and restore application functionality

-- First, drop ALL existing problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "consultants_view_requestor_profiles" ON profiles;
DROP POLICY IF EXISTS "admin_full_access" ON advisory_team_members;
DROP POLICY IF EXISTS "basic_info_access" ON advisory_team_members;
DROP POLICY IF EXISTS "own_record_access" ON advisory_team_members;
DROP POLICY IF EXISTS "own_record_update" ON advisory_team_members;

-- Create a simple, working policy for profiles that avoids infinite recursion
CREATE POLICY "users_can_view_own_profile" 
ON profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to insert their own profile
CREATE POLICY "users_can_insert_own_profile" 
ON profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "users_can_update_own_profile" 
ON profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create a secure admin-only access policy for profiles
CREATE POLICY "admins_can_view_all_profiles" 
ON profiles 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p2 
    WHERE p2.user_id = auth.uid() 
    AND p2.role = 'Admin'
  )
);

-- Create working policies for advisory_team_members that allow app functionality
-- 1. Allow all authenticated users to view basic info (needed for app to work)
CREATE POLICY "authenticated_users_basic_access" 
ON advisory_team_members 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 2. Allow admins full access
CREATE POLICY "admins_full_access_team_members" 
ON advisory_team_members 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'Admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'Admin'
  )
);

-- 3. Allow team members to update their own records
CREATE POLICY "team_members_own_record_update" 
ON advisory_team_members 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Update the get_current_user_role function to be more robust
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
BEGIN
  -- Direct query without self-reference to avoid recursion
  SELECT role INTO user_role 
  FROM public.profiles 
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(user_role, 'Standard User');
END;
$$;

-- Create a simple function to get team members safely
CREATE OR REPLACE FUNCTION public.get_team_members_for_app()
RETURNS TABLE(
  id uuid, 
  user_id uuid, 
  name text, 
  title text, 
  designation text, 
  advisory_services text[], 
  expertise text[], 
  is_active boolean,
  email text,
  rate_per_hour numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Get current user role safely
  SELECT p.role INTO current_user_role 
  FROM public.profiles p 
  WHERE p.user_id = auth.uid();
  
  -- If admin, return all data including sensitive info
  IF current_user_role = 'Admin' THEN
    RETURN QUERY
    SELECT 
      atm.id,
      atm.user_id,
      atm.name,
      atm.title,
      atm.designation,
      atm.advisory_services,
      atm.expertise,
      atm.is_active,
      atm.email,
      atm.rate_per_hour
    FROM advisory_team_members atm
    WHERE atm.is_active = true;
  ELSE
    -- For non-admins, return basic info only (no email or rates)
    RETURN QUERY
    SELECT 
      atm.id,
      atm.user_id,
      atm.name,
      atm.title,
      atm.designation,
      atm.advisory_services,
      atm.expertise,
      atm.is_active,
      NULL::text as email,
      NULL::numeric as rate_per_hour
    FROM advisory_team_members atm
    WHERE atm.is_active = true;
  END IF;
END;
$$;