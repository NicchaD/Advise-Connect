-- Fix the role/title confusion in the application
-- Roles should only be 'Admin' or 'Standard User'
-- Titles should be 'Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head', 'Stakeholder'

-- First, update the profiles to have correct roles and titles
UPDATE profiles 
SET role = 'Standard User', title = 'Advisory Consultant' 
WHERE username IN ('Akash', 'Gayathri');

-- Update the sync function to check titles instead of roles
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
      -- Update existing record
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

-- Drop and recreate the get_next_assignee function to use title instead of role
DROP FUNCTION IF EXISTS public.get_next_assignee(text[], text, uuid);

CREATE OR REPLACE FUNCTION public.get_next_assignee(request_advisory_services text[], target_title text, original_assignee uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  assignee_id UUID;
  service_name TEXT;
BEGIN
  -- If requesting original assignee, return it
  IF target_title = 'Original Advisory Consultant' AND original_assignee IS NOT NULL THEN
    RETURN original_assignee;
  END IF;

  -- Get the first advisory service from the request
  IF array_length(request_advisory_services, 1) > 0 THEN
    service_name := request_advisory_services[1];
    
    -- Find assignee with matching title and advisory service, with least assignments
    SELECT atm.user_id INTO assignee_id
    FROM advisory_team_members atm
    LEFT JOIN requests r ON r.assignee_id = atm.user_id AND r.status NOT IN ('Implemented', 'Reject')
    WHERE atm.title = target_title 
      AND atm.is_active = true
      AND service_name = ANY(atm.advisory_services)
    GROUP BY atm.user_id
    ORDER BY COUNT(r.id) ASC
    LIMIT 1;
  END IF;

  -- If no specific match found, get any user with the target title
  IF assignee_id IS NULL THEN
    SELECT atm.user_id INTO assignee_id
    FROM advisory_team_members atm
    LEFT JOIN requests r ON r.assignee_id = atm.user_id AND r.status NOT IN ('Implemented', 'Reject')
    WHERE atm.title = target_title 
      AND atm.is_active = true
    GROUP BY atm.user_id
    ORDER BY COUNT(r.id) ASC
    LIMIT 1;
  END IF;

  RETURN assignee_id;
END;
$function$;