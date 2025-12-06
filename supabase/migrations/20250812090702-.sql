-- Fix RLS policies for views that are currently unprotected

-- Enable RLS on the advisory_team_members_basic view
ALTER TABLE public.advisory_team_members_basic ENABLE ROW LEVEL SECURITY;

-- Create appropriate RLS policies for the view
-- Allow authenticated users to view basic team info (non-sensitive data)
CREATE POLICY "Authenticated users can view basic team info" 
ON public.advisory_team_members_basic 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- Allow anonymous users to view only essential public info (for public-facing features)
-- This is more restrictive and only shows minimal data
CREATE POLICY "Public can view essential team info" 
ON public.advisory_team_members_basic 
FOR SELECT 
TO anon
USING (
  is_active = true 
  AND title IN ('Advisory Service Head', 'Advisory Service Lead') -- Only show leadership for public visibility
);

-- Enable RLS on request_feedback_with_user view
ALTER TABLE public.request_feedback_with_user ENABLE ROW LEVEL SECURITY;

-- Create policies for request_feedback_with_user view
-- Users can view feedback on their own requests
CREATE POLICY "Users can view feedback on their requests" 
ON public.request_feedback_with_user 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM requests 
    WHERE requests.id = request_feedback_with_user.request_id 
    AND (requests.requestor_id = auth.uid() OR requests.assignee_id = auth.uid())
  )
);

-- Admins and consultants can view all feedback
CREATE POLICY "Admins and consultants can view all feedback" 
ON public.request_feedback_with_user 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND (
      profiles.role = 'Admin' 
      OR profiles.title IN ('Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head')
    )
  )
);

-- For extra security, let's also verify that the main advisory_team_members table 
-- doesn't have any publicly accessible policies
-- Check current policies first
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    -- Count policies that allow anonymous access to advisory_team_members
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'advisory_team_members'
    AND roles @> '{anon}';
    
    -- If there are any anonymous policies, log it (we'll handle this manually if needed)
    IF policy_count > 0 THEN
        RAISE NOTICE 'Found % anonymous policies on advisory_team_members table', policy_count;
    END IF;
END $$;