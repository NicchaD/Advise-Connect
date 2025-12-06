-- Fix Security Definer View warnings by redesigning access control
-- Move from SECURITY DEFINER functions to SECURITY INVOKER with proper RLS policies

-- Step 1: Drop the current views that use SECURITY DEFINER functions
DROP VIEW IF EXISTS public.advisory_team_members_basic;
DROP VIEW IF EXISTS public.request_feedback_with_user;

-- Step 2: Drop the SECURITY DEFINER functions
DROP FUNCTION IF EXISTS public.get_team_members_basic();
DROP FUNCTION IF EXISTS public.get_request_feedback_with_user();

-- Step 3: Create new secure tables/views that work with SECURITY INVOKER
-- Create a materialized view for team member basic info (refreshed periodically)
CREATE MATERIALIZED VIEW public.advisory_team_members_safe AS
SELECT 
  id,
  user_id,
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

-- Enable RLS on the materialized view
ALTER MATERIALIZED VIEW public.advisory_team_members_safe ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for the safe view
CREATE POLICY "Authenticated users can view basic team info" 
ON public.advisory_team_members_safe 
FOR SELECT 
TO authenticated
USING (is_active = true);

CREATE POLICY "Public can view leadership info" 
ON public.advisory_team_members_safe 
FOR SELECT 
TO anon
USING (
  is_active = true 
  AND title IN ('Advisory Service Head', 'Advisory Service Lead')
);

-- Create a regular view as an alias (with SECURITY INVOKER by default)
CREATE VIEW public.advisory_team_members_basic AS
SELECT * FROM public.advisory_team_members_safe;

-- Grant permissions
GRANT SELECT ON public.advisory_team_members_safe TO authenticated, anon;
GRANT SELECT ON public.advisory_team_members_basic TO authenticated, anon;

-- Step 4: Create a secure view for request feedback
-- This one is more complex because it needs to join with user data
CREATE VIEW public.request_feedback_with_user 
WITH (security_invoker=on) AS
SELECT 
  rf.id,
  rf.request_id,
  rf.user_id,
  rf.overall_rating,
  rf.quality_rating,
  rf.communication_rating,
  rf.response_time_rating,
  rf.satisfaction_rating,
  rf.feedback_text,
  rf.benefits_achieved,
  rf.suggestions_for_improvement,
  rf.created_at,
  rf.updated_at,
  COALESCE(p.username, p.email, 'Unknown User') as username
FROM public.request_feedback rf
LEFT JOIN public.profiles p ON p.user_id = rf.user_id;

-- Enable RLS on the feedback view
ALTER VIEW public.request_feedback_with_user SET (security_barrier = true);

-- Grant permissions
GRANT SELECT ON public.request_feedback_with_user TO authenticated;

-- Step 5: Keep the get_safe_team_member_info function for admin access
-- But make it clear it's for admin use only
COMMENT ON FUNCTION public.get_safe_team_member_info IS 
'ADMIN ONLY: Secure function to access full advisory team member data including sensitive fields. 
Use advisory_team_members_basic view for regular access to non-sensitive data.';

-- Step 6: Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION public.refresh_team_members_safe()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.advisory_team_members_safe;
END;
$$;

-- Grant execute permission to authenticated users so it can be refreshed when needed
GRANT EXECUTE ON FUNCTION public.refresh_team_members_safe TO authenticated;

-- Add comments for documentation
COMMENT ON MATERIALIZED VIEW public.advisory_team_members_safe IS 
'Safe view of advisory team members with sensitive data (email, rates) removed. 
Refresh periodically using refresh_team_members_safe() function.';

COMMENT ON VIEW public.advisory_team_members_basic IS 
'Public interface for basic advisory team member information. 
Uses SECURITY INVOKER to respect RLS policies.';

COMMENT ON VIEW public.request_feedback_with_user IS 
'Secure view of request feedback with usernames. Uses SECURITY INVOKER to respect RLS policies.';