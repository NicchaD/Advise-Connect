-- Completely remove recursion by simplifying admin policies

-- Drop the problematic admin policy that causes recursion
DROP POLICY IF EXISTS "admin_all_access" ON public.profiles;

-- Create separate simple policies without recursion
-- Basic user access - own profile only
CREATE POLICY "user_own_profile_read" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "user_own_profile_insert" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Note: Admin access will be handled by bypassing RLS in admin functions
-- This eliminates the recursion problem entirely

-- Simplify advisory_team_members access 
DROP POLICY IF EXISTS "admin_team_all_access" ON public.advisory_team_members;

-- Only allow users to see their own advisory team member record
CREATE POLICY "own_team_record_access" 
ON public.advisory_team_members 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Admin access to be handled via security definer functions
-- Create admin function that bypasses RLS for profiles access
CREATE OR REPLACE FUNCTION public.admin_get_all_profiles()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  email text,
  role text,
  title text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- First check if current user is admin by direct query
  SELECT p.role INTO current_user_role 
  FROM public.profiles p 
  WHERE p.user_id = auth.uid();
  
  IF current_user_role = 'Admin' THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.user_id,
      p.username,
      p.email,
      p.role,
      p.title,
      p.status,
      p.created_at,
      p.updated_at
    FROM public.profiles p;
  ELSE
    -- Return empty result if not admin
    RETURN;
  END IF;
END;
$$;

-- Create admin function for advisory team members
CREATE OR REPLACE FUNCTION public.admin_get_advisory_team_members()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  name text,
  title text,
  designation text,
  email text,
  advisory_services text[],
  expertise text[],
  rate_per_hour numeric,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Check if current user is admin
  SELECT p.role INTO current_user_role 
  FROM public.profiles p 
  WHERE p.user_id = auth.uid();
  
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
    FROM public.advisory_team_members atm;
  ELSE
    -- Return empty result if not admin
    RETURN;
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.admin_get_all_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_advisory_team_members TO authenticated;