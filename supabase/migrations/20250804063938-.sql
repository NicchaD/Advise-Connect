-- Add unique constraint on user_id and fix the trigger function
ALTER TABLE public.advisory_team_members 
ADD CONSTRAINT advisory_team_members_user_id_unique UNIQUE (user_id);

-- Fix the sync function to handle conflicts properly
CREATE OR REPLACE FUNCTION public.sync_advisory_team_members()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if the user has an advisory title
  IF NEW.role IN ('Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head') THEN
    
    -- Check if advisory team member already exists
    IF EXISTS (SELECT 1 FROM public.advisory_team_members WHERE user_id = NEW.user_id) THEN
      -- Update existing record
      UPDATE public.advisory_team_members 
      SET 
        name = NEW.username,
        title = NEW.role,
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
        NEW.role,
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
$$;