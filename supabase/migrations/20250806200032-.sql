-- Fix the non-existent request_status_history table reference in update_request_status_and_assignee function
CREATE OR REPLACE FUNCTION update_request_status_and_assignee(
  p_request_id UUID,
  new_status TEXT,
  performed_by UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_status TEXT;
  current_assignee_id UUID;
  original_assignee_id UUID;
  new_assignee_id UUID;
  consultant_role TEXT;
  available_consultant UUID;
  result JSON;
BEGIN
  -- Get current request details with explicit table alias
  SELECT r.status, r.assignee_id, r.original_assignee_id 
  INTO current_status, current_assignee_id, original_assignee_id
  FROM requests r
  WHERE r.id = p_request_id;
  
  -- Check if request exists
  IF current_status IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Request not found');
  END IF;
  
  -- Determine the required role for the new status
  SELECT role_required INTO consultant_role
  FROM status_transitions 
  WHERE from_status = current_status AND to_status = new_status;
  
  -- If no transition rule found, keep current assignee
  IF consultant_role IS NULL THEN
    new_assignee_id := current_assignee_id;
  ELSE
    -- Special case: Review -> Estimation should go back to original assignee
    IF current_status = 'Review' AND new_status = 'Estimation' AND original_assignee_id IS NOT NULL THEN
      new_assignee_id := original_assignee_id;
    ELSE
      -- Find an available consultant with the required title (not role, since role column doesn't exist)
      SELECT atm.user_id INTO available_consultant
      FROM advisory_team_members atm
      WHERE atm.title = consultant_role
        AND atm.is_active = true
        AND atm.user_id NOT IN (
          SELECT DISTINCT r2.assignee_id 
          FROM requests r2
          WHERE r2.status IN ('In Progress', 'Review', 'Estimation') 
            AND r2.assignee_id IS NOT NULL
            AND r2.id != p_request_id
        )
      ORDER BY RANDOM()
      LIMIT 1;
      
      -- If no available consultant found, return error
      IF available_consultant IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'No available consultants with required role: ' || consultant_role);
      END IF;
      
      new_assignee_id := available_consultant;
    END IF;
  END IF;
  
  -- Update the request
  UPDATE requests 
  SET 
    status = new_status,
    assignee_id = new_assignee_id,
    updated_at = now()
  WHERE id = p_request_id;
  
  -- Update service_specific_data with new assigned consultant name
  UPDATE requests 
  SET service_specific_data = jsonb_set(
    service_specific_data,
    '{assignedConsultant}',
    to_jsonb((SELECT username FROM profiles WHERE user_id = new_assignee_id))
  )
  WHERE id = p_request_id;
  
  -- Add status history entry using the existing request_history table
  INSERT INTO request_history (request_id, action, old_value, new_value, performed_by)
  VALUES (p_request_id, 'Status changed', current_status, new_status, performed_by);
  
  -- Add assignee history if assignee changed
  IF current_assignee_id != new_assignee_id THEN
    -- Mark previous assignment as ended
    UPDATE request_assignee_history 
    SET unassigned_at = now()
    WHERE request_id = p_request_id AND assignee_id = current_assignee_id AND unassigned_at IS NULL;
    
    -- Add new assignment
    INSERT INTO request_assignee_history (request_id, assignee_id, assigned_at)
    VALUES (p_request_id, new_assignee_id, now());
    
    -- Also log the assignee change in request_history
    INSERT INTO request_history (request_id, action, old_value, new_value, performed_by)
    VALUES (p_request_id, 'Reassigned', current_assignee_id::text, new_assignee_id::text, performed_by);
  END IF;
  
  -- Return success with reassignment info
  IF current_assignee_id != new_assignee_id THEN
    result := json_build_object('success', true, 'reassigned', true, 'new_assignee_id', new_assignee_id);
  ELSE
    result := json_build_object('success', true, 'reassigned', false);
  END IF;
  
  RETURN result;
END;
$$;