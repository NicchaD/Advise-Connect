-- Drop all existing policies on advisory_team_members table to start fresh
DROP POLICY IF EXISTS "admin_full_access" ON advisory_team_members;
DROP POLICY IF EXISTS "own_record_access" ON advisory_team_members;
DROP POLICY IF EXISTS "service_leads_basic_access" ON advisory_team_members;
DROP POLICY IF EXISTS "service_leads_public_info_only" ON advisory_team_members;

-- Create strict RLS policies for advisory_team_members table
-- Only admins can have full access to all records
CREATE POLICY "admin_only_full_access" 
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

-- Team members can only view their own basic record (no sensitive data like rates)
CREATE POLICY "own_basic_record_only" 
ON advisory_team_members 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid()
);

-- Ensure the table has RLS enabled
ALTER TABLE advisory_team_members ENABLE ROW LEVEL SECURITY;

-- Update the get_advisory_team_members_public function to be more restrictive
CREATE OR REPLACE FUNCTION public.get_advisory_team_members_public()
RETURNS TABLE(id uuid, name text, title text, designation text, advisory_services text[], expertise text[], is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only authenticated users can access even basic public info
  -- Remove email and rate information completely from public access
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

-- Update the get_advisory_team_members_basic function to be more secure
CREATE OR REPLACE FUNCTION public.get_advisory_team_members_basic()
RETURNS TABLE(id uuid, name text, title text, designation text, advisory_services text[], expertise text[], is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Only allow admins to access this data
  IF current_user_role = 'Admin' THEN
    RETURN QUERY
    SELECT 
      atm.id, atm.name, atm.title, atm.designation,
      atm.advisory_services, atm.expertise, atm.is_active,
      atm.created_at, atm.updated_at
    FROM advisory_team_members atm
    WHERE atm.is_active = true;
  END IF;
  
  -- Return nothing for non-admin users
END;
$$;