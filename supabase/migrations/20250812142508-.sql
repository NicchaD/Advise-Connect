-- Drop the existing policy that still allows basic access
DROP POLICY IF EXISTS "own_basic_info_only" ON advisory_team_members;

-- Create a completely restrictive policy - only admins can access the table directly
CREATE POLICY "admin_only_table_access" 
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

-- Update all rate-related functions to be admin-only
CREATE OR REPLACE FUNCTION public.get_assignee_rate(assignee_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  assignee_rate NUMERIC;
  current_user_role TEXT;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Only allow access if user is Admin
  IF current_user_role = 'Admin' THEN
    SELECT rate_per_hour INTO assignee_rate
    FROM advisory_team_members 
    WHERE user_id = assignee_user_id AND is_active = true;
    
    RETURN COALESCE(assignee_rate, 0);
  ELSE
    -- Return null for unauthorized access
    RETURN NULL;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_team_member_rate(member_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  member_rate NUMERIC;
  current_user_role TEXT;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Only allow access if user is Admin
  IF current_user_role = 'Admin' THEN
    SELECT rate_per_hour INTO member_rate
    FROM advisory_team_members 
    WHERE user_id = member_user_id AND is_active = true;
    
    RETURN COALESCE(member_rate, 0);
  ELSE
    -- Return null for unauthorized access
    RETURN NULL;
  END IF;
END;
$$;

-- Create a secure function that returns only non-sensitive data for authenticated users
CREATE OR REPLACE FUNCTION public.get_team_members_safe()
RETURNS TABLE(id uuid, name text, title text, designation text, advisory_services text[], expertise text[], is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only authenticated users can access this data
  -- No emails, rates, or user_ids exposed
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

-- Create admin-only function for full access including rates
CREATE OR REPLACE FUNCTION public.get_team_members_admin()
RETURNS TABLE(id uuid, user_id uuid, name text, title text, designation text, email text, advisory_services text[], expertise text[], rate_per_hour numeric, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Check if current user is admin
  SELECT role INTO current_user_role 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Only admins can access sensitive data including rates
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
  END IF;
END;
$$;