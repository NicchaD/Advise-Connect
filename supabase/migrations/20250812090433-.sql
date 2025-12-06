-- Fix security issue: Restrict access to sensitive employee data in advisory_team_members table

-- First, drop the overly permissive policy that allows all advisory roles to see sensitive data
DROP POLICY IF EXISTS "Advisory roles can view basic team member info" ON public.advisory_team_members;

-- Create a more restrictive policy for advisory roles - they can only see basic non-sensitive info
-- This will be handled through the secure view instead
CREATE POLICY "Advisory roles can view limited team info" 
ON public.advisory_team_members 
FOR SELECT 
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.title = ANY(ARRAY['Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head'])
  )
  -- Only allow access to non-sensitive columns by creating a view for this access pattern
);

-- However, since we can't restrict columns in RLS, let's remove this policy entirely
-- and rely on the secure view for non-sensitive access
DROP POLICY IF EXISTS "Advisory roles can view limited team info" ON public.advisory_team_members;

-- Now update the advisory_team_members_basic view to be more secure
-- Drop the existing view and recreate it with proper security
DROP VIEW IF EXISTS public.advisory_team_members_basic;

-- Create a secure view that only exposes non-sensitive information
-- This view will NOT include email addresses or hourly rates
CREATE VIEW public.advisory_team_members_basic AS
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

-- Set up RLS on the view to allow authenticated users to view basic team info
ALTER VIEW public.advisory_team_members_basic SET (security_barrier = true);

-- Grant appropriate permissions
GRANT SELECT ON public.advisory_team_members_basic TO authenticated;
GRANT SELECT ON public.advisory_team_members_basic TO anon;

-- For rate access, create a special function that only allows authorized access
CREATE OR REPLACE FUNCTION public.get_team_member_rate(member_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  member_rate NUMERIC;
  current_user_role TEXT;
  current_user_title TEXT;
BEGIN
  -- Get current user's role and title
  SELECT role, title INTO current_user_role, current_user_title
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Only allow access if user is:
  -- 1. Admin
  -- 2. The team member themselves
  -- 3. Advisory Service Head or Lead (for budget/estimation purposes)
  IF current_user_role = 'Admin' 
     OR auth.uid() = member_user_id 
     OR current_user_title IN ('Advisory Service Head', 'Advisory Service Lead') THEN
    
    SELECT rate_per_hour INTO member_rate
    FROM advisory_team_members 
    WHERE user_id = member_user_id AND is_active = true;
    
    RETURN COALESCE(member_rate, 0);
  ELSE
    -- Return null for unauthorized access
    RETURN NULL;
  END IF;
END;
$$;