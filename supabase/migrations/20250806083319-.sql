-- Fix security issue: Update function with proper search path
CREATE OR REPLACE FUNCTION public.track_request_assignee_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If this is an INSERT with an assignee, create initial history record
  IF TG_OP = 'INSERT' AND NEW.assignee_id IS NOT NULL THEN
    INSERT INTO public.request_assignee_history (
      request_id, 
      assignee_id, 
      status_at_assignment
    ) VALUES (
      NEW.id, 
      NEW.assignee_id, 
      NEW.status
    );
    RETURN NEW;
  END IF;
  
  -- If this is an UPDATE and assignee changed
  IF TG_OP = 'UPDATE' AND OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
    -- Close previous assignee record if exists
    IF OLD.assignee_id IS NOT NULL THEN
      UPDATE public.request_assignee_history 
      SET 
        unassigned_at = now(),
        status_at_unassignment = NEW.status,
        updated_at = now()
      WHERE request_id = NEW.id 
        AND assignee_id = OLD.assignee_id 
        AND unassigned_at IS NULL;
    END IF;
    
    -- Create new assignee record if new assignee exists
    IF NEW.assignee_id IS NOT NULL THEN
      INSERT INTO public.request_assignee_history (
        request_id, 
        assignee_id, 
        status_at_assignment
      ) VALUES (
        NEW.id, 
        NEW.assignee_id, 
        NEW.status
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;