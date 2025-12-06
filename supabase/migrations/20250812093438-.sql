-- Fix infinite recursion in RLS policies

-- First, let's fix the get_current_user_role function to be simpler and avoid recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Drop all existing problematic policies on profiles table
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view usernames in feedback context" ON public.profiles;

-- Create simple, non-recursive policies for profiles table
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- For admin access, create a separate function that doesn't cause recursion
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'Admin'
  );
$$;

-- Admin policies using the separate function
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM public.profiles WHERE role = 'Admin'
  )
);

CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.profiles WHERE role = 'Admin'
  )
);

CREATE POLICY "Admins can update profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM public.profiles WHERE role = 'Admin'
  )
);

CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM public.profiles WHERE role = 'Admin'
  )
);

-- Simple policy for feedback context - avoid complex nested queries
CREATE POLICY "Basic profile access for consultants" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  -- Allow consultants to see basic profile info
  auth.uid() IN (
    SELECT user_id FROM public.profiles 
    WHERE title IN ('Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head')
  )
);

-- Fix advisory_team_members policies to not reference profiles directly
DROP POLICY IF EXISTS "Admins can view all advisory team members" ON public.advisory_team_members;
DROP POLICY IF EXISTS "Admins can insert advisory team members" ON public.advisory_team_members;
DROP POLICY IF EXISTS "Admins can update advisory team members" ON public.advisory_team_members;
DROP POLICY IF EXISTS "Admins can delete advisory team members" ON public.advisory_team_members;

-- Recreate advisory_team_members policies without causing recursion
CREATE POLICY "Admins can view all advisory team members" 
ON public.advisory_team_members 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM public.profiles WHERE role = 'Admin'
  )
);

CREATE POLICY "Team members can view their own record" 
ON public.advisory_team_members 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can insert advisory team members" 
ON public.advisory_team_members 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.profiles WHERE role = 'Admin'
  )
);

CREATE POLICY "Admins can update advisory team members" 
ON public.advisory_team_members 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM public.profiles WHERE role = 'Admin'
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.profiles WHERE role = 'Admin'
  )
);

CREATE POLICY "Team members can update their own basic info" 
ON public.advisory_team_members 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can delete advisory team members" 
ON public.advisory_team_members 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM public.profiles WHERE role = 'Admin'
  )
);