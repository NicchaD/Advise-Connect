-- Clean up duplicate advisory team members and properly sync
-- First, remove advisory team members with null user_id where a profile exists
DELETE FROM public.advisory_team_members 
WHERE user_id IS NULL 
  AND email IN (
    SELECT email FROM public.profiles 
    WHERE role IN ('Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head')
  );

-- Update profiles to Advisory Consultant role which will trigger the sync function
UPDATE public.profiles 
SET role = 'Advisory Consultant',
    updated_at = now()
WHERE email = 'akash@cognizant.com';