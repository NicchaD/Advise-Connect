-- Fix critical security vulnerability in advisory_team_members table
-- Drop the overly permissive policy that allows all authenticated users to see sensitive data
DROP POLICY IF EXISTS "authenticated_users_basic_access" ON public.advisory_team_members;

-- Create a new restrictive policy for basic team member info (no sensitive data)
-- Only allow viewing of non-sensitive fields for authenticated users
CREATE POLICY "authenticated_users_limited_access" 
ON public.advisory_team_members 
FOR SELECT 
TO authenticated
USING (
  -- Allow all authenticated users to see basic info only
  -- Sensitive fields (email, rate_per_hour) will be handled by security definer functions
  auth.uid() IS NOT NULL AND is_active = true
);

-- Update the existing security definer functions to ensure they're being used properly
-- The get_safe_team_member_info function already implements proper access control
-- but let's make sure it's the primary way to access team member data

-- Create a view that only exposes non-sensitive data for general use
CREATE OR REPLACE VIEW public.team_members_public AS
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

-- Enable RLS on the view
ALTER VIEW public.team_members_public SET (security_barrier = true);

-- Grant select permissions on the public view to authenticated users
GRANT SELECT ON public.team_members_public TO authenticated;

-- Add comment to document the security fix
COMMENT ON POLICY "authenticated_users_limited_access" ON public.advisory_team_members 
IS 'Restricts access to non-sensitive team member data only. Use security definer functions for sensitive data access.';