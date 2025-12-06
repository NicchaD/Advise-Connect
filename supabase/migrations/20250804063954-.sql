-- Update existing profiles to have advisory consultant role to trigger sync
UPDATE public.profiles 
SET role = 'Advisory Consultant',
    updated_at = now()
WHERE email = 'akash@cognizant.com' AND role != 'Advisory Consultant';

-- Manually update existing advisory team members with proper user_id links
UPDATE public.advisory_team_members 
SET user_id = (
  SELECT user_id FROM public.profiles 
  WHERE profiles.email = advisory_team_members.email 
  LIMIT 1
),
updated_at = now()
WHERE user_id IS NULL
  AND email IN (
    SELECT email FROM public.profiles
  );