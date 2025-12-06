-- Create bidirectional sync between advisory_team_members and profiles

-- First, update the existing sync function to handle advisory team member updates
CREATE OR REPLACE FUNCTION public.sync_profiles_from_advisory_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only sync if the advisory team member has a user_id
  IF NEW.user_id IS NOT NULL THEN
    -- Update the corresponding profile
    UPDATE public.profiles 
    SET 
      username = NEW.name,
      email = NEW.email,
      title = NEW.title,
      updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for advisory team member updates
DROP TRIGGER IF EXISTS sync_profiles_from_advisory_team_trigger ON public.advisory_team_members;
CREATE TRIGGER sync_profiles_from_advisory_team_trigger
  AFTER UPDATE ON public.advisory_team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profiles_from_advisory_team();

-- Update the existing sync function to be more comprehensive
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
      -- Update existing record with profile data
      UPDATE public.advisory_team_members 
      SET 
        name = NEW.username,
        title = NEW.title,
        email = NEW.email,
        updated_at = now()
      WHERE user_id = NEW.user_id;
    ELSE
      -- Insert new record
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

-- Update the admin function to handle sync properly
CREATE OR REPLACE FUNCTION public.admin_update_advisory_team_member(
  member_id uuid,
  update_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_role text;
  team_member_user_id uuid;
BEGIN
  -- Check if current user is admin
  SELECT role INTO current_user_role 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  IF current_user_role = 'Admin' THEN
    -- Get the user_id of the team member being updated
    SELECT user_id INTO team_member_user_id 
    FROM advisory_team_members 
    WHERE id = member_id;
    
    -- Update advisory team member
    UPDATE advisory_team_members 
    SET 
      name = COALESCE(update_data->>'name', name),
      title = COALESCE(update_data->>'title', title),
      designation = COALESCE(update_data->>'designation', designation),
      email = COALESCE(update_data->>'email', email),
      advisory_services = COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(update_data->'advisory_services')), 
        advisory_services
      ),
      expertise = COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(update_data->'expertise')), 
        expertise
      ),
      user_id = COALESCE((update_data->>'user_id')::uuid, user_id),
      rate_per_hour = COALESCE((update_data->>'rate_per_hour')::numeric, rate_per_hour),
      updated_at = now()
    WHERE id = member_id;
    
    -- Manually sync to profiles if user_id exists
    IF team_member_user_id IS NOT NULL THEN
      UPDATE profiles 
      SET 
        username = COALESCE(update_data->>'name', (SELECT name FROM advisory_team_members WHERE id = member_id)),
        email = COALESCE(update_data->>'email', (SELECT email FROM advisory_team_members WHERE id = member_id)),
        title = COALESCE(update_data->>'title', (SELECT title FROM advisory_team_members WHERE id = member_id)),
        updated_at = now()
      WHERE user_id = team_member_user_id;
    END IF;
    
  ELSE
    RAISE EXCEPTION 'Only admins can update team members';
  END IF;
END;
$function$;