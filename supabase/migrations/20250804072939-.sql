-- Sync profiles table with advisory_team_members table
-- Update existing advisory team members with current profile data
UPDATE public.advisory_team_members 
SET 
  name = p.username,
  email = p.email,
  title = p.role,
  updated_at = now()
FROM public.profiles p
WHERE advisory_team_members.user_id = p.user_id
AND p.role IN ('Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head');

-- Insert missing advisory team members from profiles
INSERT INTO public.advisory_team_members (
  user_id,
  name,
  title,
  email,
  advisory_services,
  expertise,
  is_active,
  created_at,
  updated_at
)
SELECT 
  p.user_id,
  p.username,
  p.role,
  p.email,
  '{}',
  '{}',
  true,
  now(),
  now()
FROM public.profiles p
WHERE p.role IN ('Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head')
AND NOT EXISTS (
  SELECT 1 FROM public.advisory_team_members atm 
  WHERE atm.user_id = p.user_id
);

-- Remove advisory team members who no longer have advisory roles
DELETE FROM public.advisory_team_members
WHERE user_id NOT IN (
  SELECT user_id FROM public.profiles 
  WHERE role IN ('Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head')
);

-- Recreate the sync trigger to ensure future changes are properly synced
DROP TRIGGER IF EXISTS sync_advisory_team_trigger ON public.profiles;

CREATE TRIGGER sync_advisory_team_trigger
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_advisory_team_members();