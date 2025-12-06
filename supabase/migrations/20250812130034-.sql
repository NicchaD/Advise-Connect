-- Enable RLS on request_feedback_with_user table/view
-- First check if it's a view or table and handle accordingly

-- Since request_feedback_with_user appears to be a view, we need to secure the underlying data
-- Let's create RLS policies for the request_feedback table if they don't exist or are insufficient

-- Enable RLS on request_feedback table (should already be enabled, but ensuring)
ALTER TABLE public.request_feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing potentially insufficient policies
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.request_feedback;
DROP POLICY IF EXISTS "Users can create feedback for their requests" ON public.request_feedback;
DROP POLICY IF EXISTS "Users can update their own feedback" ON public.request_feedback;
DROP POLICY IF EXISTS "Admins and consultants can view all feedback" ON public.request_feedback;

-- Create comprehensive RLS policies for request_feedback table

-- Policy 1: Users can view their own feedback
CREATE POLICY "users_own_feedback_view" 
ON public.request_feedback 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Users can create feedback for their own requests
CREATE POLICY "users_create_own_feedback" 
ON public.request_feedback 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.requests 
    WHERE requests.id = request_feedback.request_id 
    AND requests.requestor_id = auth.uid()
  )
);

-- Policy 3: Users can update their own feedback
CREATE POLICY "users_update_own_feedback" 
ON public.request_feedback 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Admins can view all feedback
CREATE POLICY "admins_view_all_feedback" 
ON public.request_feedback 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'Admin'
  )
);

-- Policy 5: Advisory consultants can view feedback for requests they were assigned to
CREATE POLICY "consultants_view_assigned_feedback" 
ON public.request_feedback 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.title IN ('Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head')
    AND EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_feedback.request_id 
      AND (r.assignee_id = auth.uid() OR r.original_assignee_id = auth.uid())
    )
  )
);

-- Create a secure view for request_feedback_with_user that respects RLS
DROP VIEW IF EXISTS public.request_feedback_with_user;

CREATE VIEW public.request_feedback_with_user 
WITH (security_invoker = true) AS
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
  p.username
FROM public.request_feedback rf
LEFT JOIN public.profiles p ON rf.user_id = p.user_id;

-- Create a function for secure feedback access (alternative approach)
CREATE OR REPLACE FUNCTION public.get_secure_feedback_data(feedback_request_id uuid DEFAULT NULL)
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
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  username text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_role text;
  current_user_title text;
  requesting_user_id uuid;
BEGIN
  requesting_user_id := auth.uid();
  
  IF requesting_user_id IS NULL THEN
    RETURN;
  END IF;
  
  SELECT profiles.role, profiles.title 
  INTO current_user_role, current_user_title
  FROM profiles 
  WHERE profiles.user_id = requesting_user_id;
  
  -- Admins can see all feedback
  IF current_user_role = 'Admin' THEN
    RETURN QUERY
    SELECT 
      rf.id, rf.request_id, rf.user_id, rf.overall_rating, rf.quality_rating,
      rf.communication_rating, rf.response_time_rating, rf.satisfaction_rating,
      rf.feedback_text, rf.benefits_achieved, rf.suggestions_for_improvement,
      rf.created_at, rf.updated_at, p.username
    FROM request_feedback rf
    LEFT JOIN profiles p ON rf.user_id = p.user_id
    WHERE (feedback_request_id IS NULL OR rf.request_id = feedback_request_id);
    
  -- Advisory consultants can see feedback for their assigned requests
  ELSIF current_user_title IN ('Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head') THEN
    RETURN QUERY
    SELECT 
      rf.id, rf.request_id, rf.user_id, rf.overall_rating, rf.quality_rating,
      rf.communication_rating, rf.response_time_rating, rf.satisfaction_rating,
      rf.feedback_text, rf.benefits_achieved, rf.suggestions_for_improvement,
      rf.created_at, rf.updated_at, p.username
    FROM request_feedback rf
    LEFT JOIN profiles p ON rf.user_id = p.user_id
    INNER JOIN requests r ON rf.request_id = r.id
    WHERE (r.assignee_id = requesting_user_id OR r.original_assignee_id = requesting_user_id)
    AND (feedback_request_id IS NULL OR rf.request_id = feedback_request_id);
    
  ELSE
    -- Regular users can only see their own feedback
    RETURN QUERY
    SELECT 
      rf.id, rf.request_id, rf.user_id, rf.overall_rating, rf.quality_rating,
      rf.communication_rating, rf.response_time_rating, rf.satisfaction_rating,
      rf.feedback_text, rf.benefits_achieved, rf.suggestions_for_improvement,
      rf.created_at, rf.updated_at, p.username
    FROM request_feedback rf
    LEFT JOIN profiles p ON rf.user_id = p.user_id
    WHERE rf.user_id = requesting_user_id
    AND (feedback_request_id IS NULL OR rf.request_id = feedback_request_id);
  END IF;
END;
$$;