-- Add trigger to auto-assign advisory consultant when request is created with status 'New'
CREATE OR REPLACE FUNCTION public.auto_assign_new_request()
RETURNS TRIGGER AS $$
DECLARE
  assigned_consultant_id UUID;
  assigned_consultant_name TEXT;
BEGIN
  -- Only auto-assign for new requests with status 'New' and no existing assignee
  IF NEW.status = 'New' AND NEW.assignee_id IS NULL THEN
    -- Get the next assignee using existing function
    assigned_consultant_id := get_next_assignee(NEW.advisory_services, 'Advisory Consultant', NULL);
    
    -- If we found a consultant, assign them
    IF assigned_consultant_id IS NOT NULL THEN
      -- Get the consultant's name
      SELECT username INTO assigned_consultant_name
      FROM profiles
      WHERE user_id = assigned_consultant_id;
      
      -- Set the assignee
      NEW.assignee_id := assigned_consultant_id;
      NEW.original_assignee_id := assigned_consultant_id;
      NEW.current_assignee_name := assigned_consultant_name;
      NEW.original_assignee_name := assigned_consultant_name;
      NEW.assigned_consultant_name := assigned_consultant_name;
      
      -- Update service_specific_data with assigned consultant name
      NEW.service_specific_data := jsonb_set(
        NEW.service_specific_data,
        '{assignedConsultant}',
        to_jsonb(assigned_consultant_name)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-assignment on insert
DROP TRIGGER IF EXISTS trigger_auto_assign_new_request ON public.requests;
CREATE TRIGGER trigger_auto_assign_new_request
  BEFORE INSERT ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_new_request();