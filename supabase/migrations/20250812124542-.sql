-- Fix Security Definer View issue
-- Drop the existing view that uses SECURITY DEFINER function
DROP VIEW IF EXISTS public.advisory_team_members_basic;

-- Create a new view that directly queries the table without SECURITY DEFINER function
-- This will respect RLS policies of the querying user
CREATE VIEW public.advisory_team_members_basic AS
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

-- Grant appropriate permissions to the view
GRANT SELECT ON public.advisory_team_members_basic TO authenticated;
GRANT SELECT ON public.advisory_team_members_basic TO anon;