-- Create a function to get all feedback data for insights dashboard (visible to all authenticated users)
CREATE OR REPLACE FUNCTION public.get_all_feedback_for_insights()
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
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow all authenticated users to see all feedback for insights dashboard
  IF auth.uid() IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      rf.id, rf.request_id, rf.user_id, rf.overall_rating, rf.quality_rating,
      rf.communication_rating, rf.response_time_rating, rf.satisfaction_rating,
      rf.feedback_text, rf.benefits_achieved, rf.suggestions_for_improvement,
      rf.created_at, rf.updated_at, p.username
    FROM request_feedback rf
    LEFT JOIN profiles p ON rf.user_id = p.user_id
    ORDER BY rf.created_at DESC;
  END IF;
END;
$function$;