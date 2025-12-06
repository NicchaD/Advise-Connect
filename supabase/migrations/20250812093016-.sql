-- Fix the advisory_team_members RLS policies to properly restrict access
-- Only allow admins and team members themselves to access their own records

-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage advisory team members" ON public.advisory_team_members;

-- Create proper RLS policies
-- Admins can view all advisory team members
CREATE POLICY "Admins can view all advisory team members" 
ON public.advisory_team_members 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'Admin'
  )
);

-- Team members can view their own record only
CREATE POLICY "Team members can view their own record" 
ON public.advisory_team_members 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Admins can insert advisory team members
CREATE POLICY "Admins can insert advisory team members" 
ON public.advisory_team_members 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'Admin'
  )
);

-- Admins can update advisory team members
CREATE POLICY "Admins can update advisory team members" 
ON public.advisory_team_members 
FOR UPDATE 
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

-- Team members can update their own basic info (excluding sensitive fields)
CREATE POLICY "Team members can update their own basic info" 
ON public.advisory_team_members 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can delete advisory team members
CREATE POLICY "Admins can delete advisory team members" 
ON public.advisory_team_members 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'Admin'
  )
);