-- Fix the sync function to handle existing data and ensure proper user_id mapping
CREATE OR REPLACE FUNCTION public.sync_advisory_team_members()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
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
      updated_at = now()
    WHERE advisory_team_members.user_id IS NOT NULL;
    
    -- Handle case where user_id is null - update by email match
    UPDATE public.advisory_team_members 
    SET 
      user_id = NEW.user_id,
      name = NEW.username,
      title = NEW.role,
      updated_at = now()
    WHERE email = NEW.email 
      AND user_id IS NULL
      AND NEW.user_id IS NOT NULL;
      
  ELSE
    -- If the user no longer has an advisory title, remove them from advisory team
    DELETE FROM public.advisory_team_members WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;