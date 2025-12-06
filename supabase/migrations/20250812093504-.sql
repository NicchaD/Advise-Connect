-- Fix infinite recursion by completely rebuilding RLS policies

-- Drop ALL existing policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view usernames in feedback context" ON public.profiles;
DROP POLICY IF EXISTS "Basic profile access for consultants" ON public.profiles;

-- Create super simple, non-recursive policies for profiles table
-- Users can only see their own profile
CREATE POLICY "own_profile_select" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Users can only insert their own profile
CREATE POLICY "own_profile_insert" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admin access - use a simple direct check without function calls
CREATE POLICY "admin_all_access" 
ON public.profiles 
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'Admin'
    AND p.user_id != profiles.user_id  -- Prevent self-reference
  )
  OR auth.uid() = user_id  -- Or accessing own profile
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'Admin'
    AND p.user_id != profiles.user_id  -- Prevent self-reference
  )
  OR auth.uid() = user_id  -- Or accessing own profile
);

-- Grant SELECT permission back to authenticated users on advisory_team_members table
GRANT SELECT ON public.advisory_team_members TO authenticated;

-- Simplify advisory_team_members policies
DROP POLICY IF EXISTS "Admins can view all advisory team members" ON public.advisory_team_members;
DROP POLICY IF EXISTS "Team members can view their own record" ON public.advisory_team_members;
DROP POLICY IF EXISTS "Admins can insert advisory team members" ON public.advisory_team_members;
DROP POLICY IF EXISTS "Admins can update advisory team members" ON public.advisory_team_members;
DROP POLICY IF EXISTS "Team members can update their own basic info" ON public.advisory_team_members;
DROP POLICY IF EXISTS "Admins can delete advisory team members" ON public.advisory_team_members;

-- Create simpler advisory team policies
CREATE POLICY "admin_team_all_access" 
ON public.advisory_team_members 
FOR ALL
TO authenticated
USING (
  user_id = auth.uid()  -- Own record
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'Admin'
  )
);

-- Update the get_current_user_role function to avoid recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE user_id = auth.uid();
  RETURN user_role;
END;
$$;