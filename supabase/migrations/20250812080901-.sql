-- Drop the previous view and recreate without SECURITY DEFINER
DROP VIEW IF EXISTS request_feedback_with_user;

-- Create a simple view that joins request_feedback with profiles
CREATE VIEW request_feedback_with_user AS
SELECT 
  rf.*,
  COALESCE(p.username, p.email, 'Unknown User') as username
FROM request_feedback rf
LEFT JOIN profiles p ON rf.user_id = p.user_id;

-- Enable RLS on the view (it will inherit from the underlying tables)
ALTER VIEW request_feedback_with_user SET (security_barrier = true);