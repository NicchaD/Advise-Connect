-- Update existing profiles to have advisory roles and then sync them back
UPDATE public.profiles 
SET role = 'Advisory Consultant',
    updated_at = now()
WHERE email IN (
  SELECT email FROM public.advisory_team_members 
  WHERE user_id IS NULL AND title = 'Advisory Consultant'
)
AND role != 'Advisory Consultant';

-- Now trigger the sync by updating the profiles (this will fire the trigger)
UPDATE public.advisory_team_members 
SET user_id = (
  SELECT user_id FROM public.profiles 
  WHERE profiles.email = advisory_team_members.email 
  AND profiles.role = advisory_team_members.title
  LIMIT 1
),
updated_at = now()
WHERE user_id IS NULL;