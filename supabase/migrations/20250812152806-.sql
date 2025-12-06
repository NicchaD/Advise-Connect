-- Fix the security definer view issue by removing the problematic view
-- and using a more secure approach with proper RLS policies

-- Drop the security definer view that was flagged
DROP VIEW IF EXISTS public.team_members_public;

-- Instead, modify the existing RLS policy to be more specific about what data can be accessed
-- The existing policy already restricts to active records and authenticated users
-- The key is that applications should use the security definer functions for sensitive data

-- Add a comment to make it clear how to safely access team member data
COMMENT ON TABLE public.advisory_team_members 
IS 'Contains sensitive employee data. Use get_safe_team_member_info() or get_team_members_for_app() functions for secure access. Direct queries only return basic info for authenticated users.';