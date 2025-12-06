-- Drop the existing problematic triggers and functions
DROP TRIGGER IF EXISTS sync_profiles_trigger ON advisory_team_members;
DROP TRIGGER IF EXISTS sync_advisory_team_trigger ON profiles;
DROP FUNCTION IF EXISTS sync_profiles_from_advisory_team();
DROP FUNCTION IF EXISTS sync_advisory_team_members();

-- Create a safer sync function that prevents recursion
CREATE OR REPLACE FUNCTION public.sync_profiles_from_advisory_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only sync if the advisory team member has a user_id
  -- and only update specific fields to prevent recursion
  IF NEW.user_id IS NOT NULL THEN
    -- Update the corresponding profile with a check to prevent recursion
    UPDATE public.profiles 
    SET 
      username = NEW.name,
      email = NEW.email,
      title = NEW.title,
      updated_at = now()
    WHERE user_id = NEW.user_id
      AND (
        username IS DISTINCT FROM NEW.name OR
        email IS DISTINCT FROM NEW.email OR
        title IS DISTINCT FROM NEW.title
      );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create a safer advisory team sync function that only syncs specific cases
CREATE OR REPLACE FUNCTION public.sync_advisory_team_members()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if the user has an advisory title (not role)
  IF NEW.title IN ('Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head') THEN
    
    -- Check if advisory team member already exists
    IF EXISTS (SELECT 1 FROM public.advisory_team_members WHERE user_id = NEW.user_id) THEN
      -- Only update if there are actual changes to prevent recursion
      UPDATE public.advisory_team_members 
      SET 
        name = NEW.username,
        title = NEW.title,
        email = NEW.email,
        updated_at = now()
      WHERE user_id = NEW.user_id
        AND (
          name IS DISTINCT FROM NEW.username OR
          title IS DISTINCT FROM NEW.title OR
          email IS DISTINCT FROM NEW.email
        );
    ELSE
      -- Insert new record only if it doesn't exist
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
        NEW.title,
        NEW.email,
        '{}',
        '{}',
        true
      );
    END IF;
      
  ELSE
    -- If the user no longer has an advisory title, remove them from advisory team
    DELETE FROM public.advisory_team_members WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the triggers with the updated functions
CREATE TRIGGER sync_profiles_trigger
  AFTER INSERT OR UPDATE ON public.advisory_team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profiles_from_advisory_team();

CREATE TRIGGER sync_advisory_team_trigger
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_advisory_team_members();