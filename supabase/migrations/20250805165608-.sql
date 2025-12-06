-- Fix the ambiguous column reference in update_request_status_and_assignee function
DROP FUNCTION IF EXISTS update_request_status_and_assignee(UUID, TEXT, UUID);

CREATE OR REPLACE FUNCTION update_request_status_and_assignee(
  p_request_id UUID,
  new_status TEXT,
  performed_by UUID
) RETURNS JSON AS $$
DECLARE
  request_row RECORD;
  consultant_row RECORD;
  history_record RECORD;
  old_status TEXT;
  old_assignee_id UUID;
  new_assignee_id UUID;
  assignee_name TEXT;
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
  
  -- Auto-assign consultant based on status
  IF new_status IN ('Estimation', 'Review', 'Implementing') THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;