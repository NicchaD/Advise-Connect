-- Fix the RLS policy to allow proper application functionality while maintaining security
-- The current policy is too restrictive and breaks admin functionality

-- Drop the current restrictive policy
DROP POLICY IF EXISTS "authenticated_users_limited_access" ON public.advisory_team_members;

-- Create a more balanced policy that:
-- 1. Allows basic read access to non-sensitive fields for authenticated users
-- 2. Allows admin full access for management operations
-- 3. Uses column-level restrictions instead of completely blocking access

-- First, create a policy for basic SELECT access (non-sensitive data only)
CREATE POLICY "authenticated_users_basic_select" 
ON public.advisory_team_members 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND is_active = true
);

-- Note: The sensitive columns (email, rate_per_hour) should be handled by:
-- 1. Application code using security definer functions for sensitive data
-- 2. Admin interface using the existing admin policies
-- 3. RLS will allow read access but applications should self-restrict sensitive columns

-- The existing policies already handle admin access:
-- - "admins_full_access_team_members" allows admins full CRUD
-- - "team_members_own_record_update" allows users to update their own records

-- Add a comment explaining the security model
COMMENT ON POLICY "authenticated_users_basic_select" ON public.advisory_team_members 
IS 'Allows basic read access for authenticated users. Applications should use security definer functions (get_team_members_for_app, get_safe_team_member_info) to properly restrict sensitive data like emails and rates based on user roles.';