-- Remove the unused SECURITY DEFINER function that was causing the security warning
-- This function is no longer needed since we replaced the view with direct table access
DROP FUNCTION IF EXISTS public.get_public_team_members();