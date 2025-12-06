-- Create missing profile entries for existing advisory team members
-- This ensures the sync works for both directions
INSERT INTO public.profiles (
  user_id,
  username,
  email,
  role,
  status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  atm.name,
  atm.email,
  atm.title,
  'Active',
  now(),
  now()
FROM public.advisory_team_members atm
WHERE atm.user_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.email = atm.email
  )
ON CONFLICT (email) DO NOTHING;