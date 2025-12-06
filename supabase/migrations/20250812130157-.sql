-- Remove the overly permissive policy that exposes data to all users
DROP POLICY IF EXISTS "public_basic_info" ON public.advisory_team_members;

-- The remaining policies are secure:
-- 1. "admin_full_access" - Only admins can see everything
-- 2. "service_leads_team_access" - Service leads see their team (no emails/rates)
-- 3. "own_record_access" - Users see only their own full record

-- Create a proper public view that only exposes safe information
DROP VIEW IF EXISTS public.advisory_team_members_public;

CREATE VIEW public.advisory_team_members_public AS
SELECT 
  id,
  name,
  title,
  designation,
  advisory_services,
  expertise,
  is_active,
  created_at,
  updated_at
FROM public.advisory_team_members
WHERE is_active = true;

-- Enable RLS on the public view
ALTER VIEW public.advisory_team_members_public SET (security_invoker = true);

-- Update the advisory_team_members_basic view to be more restrictive
DROP VIEW IF EXISTS public.advisory_team_members_basic;

CREATE VIEW public.advisory_team_members_basic 
WITH (security_invoker = true) AS
SELECT 
  id,
  name,
  title,
  designation,
  advisory_services,
  expertise,
  is_active,
  created_at,
  updated_at
FROM public.advisory_team_members
WHERE is_active = true;

-- Create a function for safe public access to team member info
CREATE OR REPLACE FUNCTION public.get_public_team_members()
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
  -- Only return basic info that's safe for public consumption
  -- No emails, rates, user_ids, or other sensitive data
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
END;
$$;

-- Add comment to clarify the security approach
COMMENT ON TABLE public.advisory_team_members IS 'Contains sensitive employee data. Access restricted by RLS policies. Use get_public_team_members() for safe public access to basic info only.';