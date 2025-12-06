-- Security fix for advisory team member views
-- Drop existing vulnerable views and replace with secure functions

-- Drop the existing views that expose sensitive data
DROP VIEW IF EXISTS public.advisory_team_members_basic;
DROP VIEW IF EXISTS public.advisory_team_members_public;

-- Create secure function to replace advisory_team_members_basic view
-- Only returns basic info for authorized users
CREATE OR REPLACE FUNCTION public.get_advisory_team_members_basic()
RETURNS TABLE(
  id uuid,
  name text,
  title text,
  designation text,
  advisory_services text[],
  expertise text[],
  is_active boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Only allow admins and team members to access this data
  IF current_user_role = 'Admin' THEN
    -- Admins can see all basic info
    RETURN QUERY
    SELECT 
      atm.id, atm.name, atm.title, atm.designation,
      atm.advisory_services, atm.expertise, atm.is_active,
      atm.created_at, atm.updated_at
    FROM advisory_team_members atm
    WHERE atm.is_active = true;
  ELSIF auth.uid() IS NOT NULL THEN
    -- Authenticated users can only see their own basic info
    RETURN QUERY
    SELECT 
      atm.id, atm.name, atm.title, atm.designation,
      atm.advisory_services, atm.expertise, atm.is_active,
      atm.created_at, atm.updated_at
    FROM advisory_team_members atm
    WHERE atm.is_active = true AND atm.user_id = auth.uid();
  END IF;
  
  -- Return nothing for unauthenticated users
END;
$$;

-- Create secure function to replace advisory_team_members_public view
-- Only returns minimal public info for authenticated users
CREATE OR REPLACE FUNCTION public.get_advisory_team_members_public()
RETURNS TABLE(
  id uuid,
  name text,
  title text,
  designation text,
  advisory_services text[],
  expertise text[],
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only authenticated users can access even basic public info
  IF auth.uid() IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      atm.id, atm.name, atm.title, atm.designation,
      atm.advisory_services, atm.expertise, atm.is_active
    FROM advisory_team_members atm
    WHERE atm.is_active = true;
  END IF;
  
  -- Return nothing for unauthenticated users
END;
$$;