-- Create a view that joins request_feedback with profiles to always include username
CREATE OR REPLACE VIEW request_feedback_with_user AS
SELECT 
  rf.*,
  COALESCE(p.username, p.email, 'Unknown User') as username
FROM request_feedback rf
LEFT JOIN profiles p ON rf.user_id = p.user_id;