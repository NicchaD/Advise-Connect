-- Fix the original assignee tracking and assignment logic
CREATE OR REPLACE FUNCTION public.update_request_status_and_assignee(p_request_id uuid, new_status text, performed_by uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  request_row RECORD;
  consultant_row RECORD;
  old_status TEXT;
  old_assignee_id UUID;
  new_assignee_id UUID;
  assignee_name TEXT;
  original_assignee_id UUID;
BEGIN
  -- Get current request details
  SELECT r.*, p.username as requestor_username 
  INTO request_row 
  FROM requests r
  LEFT JOIN profiles p ON r.requestor_id = p.user_id
  WHERE r.id = p_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  old_status := request_row.status;
  old_assignee_id := request_row.assignee_id;
  
  -- Handle transition from "Review" to "Estimation" - assign back to original assignee
  IF new_status = 'Estimation' AND old_status = 'Review' THEN
    -- Get the original assignee from the stored field
    original_assignee_id := request_row.original_assignee_id;
    
    -- If we have the original assignee stored, assign back to them
    IF original_assignee_id IS NOT NULL THEN
      SELECT user_id, name INTO consultant_row
      FROM advisory_team_members 
      WHERE user_id = original_assignee_id AND is_active = true;
      
      IF FOUND THEN
        new_assignee_id := consultant_row.user_id;
        assignee_name := consultant_row.name;
      END IF;
    END IF;
    
  -- Handle specific transition from "Estimation" to "Review" - assign to Advisory Service Lead
  ELSIF new_status = 'Review' AND old_status = 'Estimation' THEN
    -- Store the current assignee as the original assignee if not already stored
    IF request_row.original_assignee_id IS NULL AND old_assignee_id IS NOT NULL THEN
      UPDATE requests 
      SET original_assignee_id = old_assignee_id
      WHERE id = p_request_id;
    END IF;
    
    -- Find Advisory Service Lead with matching advisory service and least requests
    SELECT atm.user_id, atm.name INTO consultant_row
    FROM advisory_team_members atm
    LEFT JOIN requests r ON r.assignee_id = atm.user_id AND r.status NOT IN ('Implemented', 'Reject', 'Closed', 'Cancelled')
    WHERE atm.title = 'Advisory Service Lead'
      AND atm.is_active = true
      AND EXISTS (
        SELECT 1 FROM unnest(request_row.advisory_services) AS service_name
        WHERE service_name = ANY(atm.advisory_services)
      )
    GROUP BY atm.user_id, atm.name
    ORDER BY COUNT(r.id) ASC
    LIMIT 1;
    
    IF FOUND THEN
      new_assignee_id := consultant_row.user_id;
      assignee_name := consultant_row.name;
    END IF;
    
  -- Handle transition from "New" to "Estimation" - store the original assignee
  ELSIF new_status = 'Estimation' AND old_status = 'New' THEN
    -- Store the current assignee as the original assignee if assigning for the first time
    IF request_row.original_assignee_id IS NULL AND old_assignee_id IS NOT NULL THEN
      UPDATE requests 
      SET original_assignee_id = old_assignee_id
      WHERE id = p_request_id;
    END IF;
    
    -- Keep the current assignee
    new_assignee_id := old_assignee_id;
    assignee_name := request_row.assigned_consultant_name;
    
  -- Auto-assign consultant based on status for other transitions
  ELSIF new_status IN ('Review', 'Implementing') THEN
    -- Find available consultant
    SELECT user_id, name INTO consultant_row
    FROM advisory_team_members atm
    WHERE is_active = true
    AND EXISTS (
      SELECT 1 FROM unnest(request_row.advisory_services) AS service_name
      WHERE service_name = ANY(atm.advisory_services)
    )
    ORDER BY (
      SELECT COUNT(*) FROM requests r2 
      WHERE r2.assignee_id = atm.user_id 
      AND r2.status NOT IN ('Closed', 'Cancelled')
    )
    LIMIT 1;
    
    IF FOUND THEN
      new_assignee_id := consultant_row.user_id;
      assignee_name := consultant_row.name;
    END IF;
  END IF;
  
  -- Update the request
  UPDATE requests 
  SET 
    status = new_status,
    assignee_id = COALESCE(new_assignee_id, assignee_id),
    assigned_consultant_name = COALESCE(assignee_name, assigned_consultant_name),
    updated_at = now()
  WHERE id = p_request_id;
  
  -- Log status change in history
  INSERT INTO request_history (request_id, performed_by, action, old_value, new_value)
  VALUES (p_request_id, performed_by, 'Status Changed', old_status, new_status);
  
  -- Log assignee change if applicable
  IF new_assignee_id IS NOT NULL AND new_assignee_id != old_assignee_id THEN
    INSERT INTO request_history (request_id, performed_by, action, old_value, new_value)
    VALUES (p_request_id, performed_by, 'Assignee Changed', 
           COALESCE((SELECT name FROM advisory_team_members WHERE user_id = old_assignee_id), 'Unassigned'),
           assignee_name);
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'new_status', new_status,
    'new_assignee_id', new_assignee_id,
    'assignee_name', assignee_name
  );
END;
$function$;