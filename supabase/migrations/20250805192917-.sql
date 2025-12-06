-- Manually populate the advisory_team_members table since the trigger might not have fired for existing records
INSERT INTO advisory_team_members (user_id, name, title, email, advisory_services, expertise, is_active)
SELECT 
  user_id,
  username,
  title,
  email,
  '{}',
  '{}',
  true
FROM profiles 
WHERE title IN ('Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head')
ON CONFLICT (user_id) DO UPDATE SET
  name = EXCLUDED.name,
  title = EXCLUDED.title,
  email = EXCLUDED.email,
  updated_at = now();