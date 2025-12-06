-- Fix view security by recreating them with proper access controls
-- Since views can't have RLS directly, we need to use security definer functions

-- First, let's recreate the advisory_team_members_basic view with proper security
DROP VIEW IF EXISTS public.advisory_team_members_basic;

-- Create a security definer function that controls access to team member data
CREATE OR REPLACE FUNCTION public.get_team_members_basic()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  name text,
  title text,
  designation text,
  advisory_services text[],
  expertise text[],
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_role text;
  current_user_title text;
  is_authenticated boolean;
BEGIN
  -- Check if user is authenticated
  is_authenticated := auth.uid() IS NOT NULL;
  
  -- Get current user's role and title if authenticated
  IF is_authenticated THEN
    SELECT profiles.role, profiles.title 
    INTO current_user_role, current_user_title
    FROM profiles 
    WHERE profiles.user_id = auth.uid();
  END IF;
  
  -- Return data based on access level
  IF is_authenticated THEN
    -- Authenticated users can see basic team info (no sensitive data)
    RETURN QUERY
    SELECT 
      atm.id,
      atm.user_id,
      atm.name,
      atm.title,
      atm.designation,
      atm.advisory_services,
      atm.expertise,
      atm.is_active,
      atm.created_at,
      atm.updated_at
    FROM advisory_team_members atm
    WHERE atm.is_active = true;
  ELSE
    -- Anonymous users can only see leadership (very limited)
    RETURN QUERY
    SELECT 
      atm.id,
      NULL::uuid as user_id, -- Hide user_id from anonymous users
      atm.name,
      atm.title,
      atm.designation,
      atm.advisory_services,
      atm.expertise,
      atm.is_active,
      atm.created_at,
      atm.updated_at
    FROM advisory_team_members atm
    WHERE atm.is_active = true 
    AND atm.title IN ('Advisory Service Head', 'Advisory Service Lead');
  END IF;
END;
$$;

-- Create the view using the secure function
CREATE VIEW public.advisory_team_members_basic AS
SELECT * FROM public.get_team_members_basic();

-- Grant appropriate permissions
GRANT SELECT ON public.advisory_team_members_basic TO authenticated;
GRANT SELECT ON public.advisory_team_members_basic TO anon;

-- Now handle the request_feedback_with_user view
-- Create a security definer function for feedback access
CREATE OR REPLACE FUNCTION public.get_request_feedback_with_user()
RETURNS TABLE(
  id uuid,
  request_id uuid,
  user_id uuid,
  overall_rating integer,
  quality_rating integer,
  communication_rating integer,
  response_time_rating integer,
  satisfaction_rating integer,
  feedback_text text,
  benefits_achieved text,
  suggestions_for_improvement text,
  created_at timestamptz,
  updated_at timestamptz,
  username text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_role text;
  current_user_title text;
BEGIN
  -- Get current user's role and title
  SELECT profiles.role, profiles.title 
  INTO current_user_role, current_user_title
  FROM profiles 
  WHERE profiles.user_id = auth.uid();
  
  -- Check if user has access to view feedback
  IF current_user_role = 'Admin' 
     OR current_user_title IN ('Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head') THEN
    -- Admins and consultants can view all feedback
    RETURN QUERY
    SELECT 
      rf.id,
      rf.request_id,
      rf.user_id,
      rf.overall_rating,
      rf.quality_rating,
      rf.communication_rating,
      rf.response_time_rating,
      rf.satisfaction_rating,
      rf.feedback_text,
      rf.benefits_achieved,
      rf.suggestions_for_improvement,
      rf.created_at,
      rf.updated_at,
      COALESCE(p.username, p.email, 'Unknown User') as username
    FROM request_feedback rf
    LEFT JOIN profiles p ON p.user_id = rf.user_id;
  ELSE
    -- Regular users can only see feedback on their own requests
    RETURN QUERY
    SELECT 
      rf.id,
      rf.request_id,
      rf.user_id,
      rf.overall_rating,
      rf.quality_rating,
      rf.communication_rating,
      rf.response_time_rating,
      rf.satisfaction_rating,
      rf.feedback_text,
      rf.benefits_achieved,
      rf.suggestions_for_improvement,
      rf.created_at,
      rf.updated_at,
      COALESCE(p.username, p.email, 'Unknown User') as username
    FROM request_feedback rf
    LEFT JOIN profiles p ON p.user_id = rf.user_id
    WHERE EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = rf.request_id 
      AND (r.requestor_id = auth.uid() OR r.assignee_id = auth.uid())
    );
  END IF;
END;
$$;

-- Recreate the view using the secure function
DROP VIEW IF EXISTS public.request_feedback_with_user;
CREATE VIEW public.request_feedback_with_user AS
SELECT * FROM public.get_request_feedback_with_user();

-- Grant appropriate permissions
GRANT SELECT ON public.request_feedback_with_user TO authenticated;