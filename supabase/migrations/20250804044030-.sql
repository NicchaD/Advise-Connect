-- Update advisory_team_members table to add new fields for advisory services and expertise
ALTER TABLE public.advisory_team_members 
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS department,
ADD COLUMN IF NOT EXISTS advisory_services text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS expertise text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Create index for better performance on user_id lookups
CREATE INDEX IF NOT EXISTS idx_advisory_team_members_user_id ON public.advisory_team_members(user_id);

-- Create a trigger function to auto-sync users with advisory titles to the advisory team
CREATE OR REPLACE FUNCTION public.sync_advisory_team_members()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user has an advisory title
  IF NEW.role IN ('Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head') THEN
    -- Insert or update the advisory team member record
    INSERT INTO public.advisory_team_members (
      user_id,
      name,
      title,
      email,
      advisory_services,
      expertise,
      is_active
    )
    VALUES (
      NEW.user_id,
      NEW.username,
      NEW.role,
      NEW.email,
      '{}',
      '{}',
      true
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      name = EXCLUDED.name,
      title = EXCLUDED.title,
      email = EXCLUDED.email,
      updated_at = now();
  ELSE
    -- If the user no longer has an advisory title, remove them from advisory team
    DELETE FROM public.advisory_team_members WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-sync users to advisory team when profiles are updated
DROP TRIGGER IF EXISTS sync_advisory_team_on_profile_update ON public.profiles;
CREATE TRIGGER sync_advisory_team_on_profile_update
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_advisory_team_members();

-- Also handle when new users are created with advisory titles
DROP TRIGGER IF EXISTS sync_advisory_team_on_profile_insert ON public.profiles;
CREATE TRIGGER sync_advisory_team_on_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_advisory_team_members();