-- Update the get_next_assignee function with new assignment logic
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
    
    -- First priority: Find assignee with matching title and advisory service, with least assignments
    SELECT atm.user_id INTO assignee_id
    FROM advisory_team_members atm
    LEFT JOIN requests r ON r.assignee_id = atm.user_id AND r.status NOT IN ('Implemented', 'Reject')
    WHERE atm.title = target_title 
      AND atm.is_active = true
      AND service_name = ANY(atm.advisory_services)
    GROUP BY atm.user_id
    ORDER BY COUNT(r.id) ASC
    LIMIT 1;
    
    -- Second priority: If Advisory Consultant not found with service match, 
    -- get Advisory Service Head for this advisory service
    IF assignee_id IS NULL AND target_title = 'Advisory Consultant' THEN
      SELECT atm.user_id INTO assignee_id
      FROM advisory_team_members atm
      LEFT JOIN requests r ON r.assignee_id = atm.user_id AND r.status NOT IN ('Implemented', 'Reject')
      WHERE atm.title = 'Advisory Service Head'
        AND atm.is_active = true
        AND service_name = ANY(atm.advisory_services)
      GROUP BY atm.user_id
      ORDER BY COUNT(r.id) ASC
      LIMIT 1;
    END IF;
    
    -- Fallback for Advisory Service Head: If no service match found,
    -- assign to advisory service head for that advisory service
    IF assignee_id IS NULL AND target_title = 'Advisory Service Head' THEN
      SELECT atm.user_id INTO assignee_id
      FROM advisory_team_members atm
      LEFT JOIN requests r ON r.assignee_id = atm.user_id AND r.status NOT IN ('Implemented', 'Reject')
      WHERE atm.title = 'Advisory Service Head'
        AND atm.is_active = true
        AND service_name = ANY(atm.advisory_services)
      GROUP BY atm.user_id
      ORDER BY COUNT(r.id) ASC
      LIMIT 1;
    END IF;
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

-- Update status transitions for New to Pending Review to assign to Advisory Service Head
UPDATE status_transitions 
SET role_required = 'Advisory Service Head'
WHERE from_status = 'New' AND to_status = 'Pending Review';

-- Update the main assignment function to handle special cases
CREATE OR REPLACE FUNCTION public.update_request_status_and_assignee(p_request_id uuid, new_status text, performed_by uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_status TEXT;
  current_assignee_id UUID;
  original_assignee_id UUID;
  new_assignee_id UUID;
  consultant_role TEXT;
  request_advisory_services TEXT[];
  request_service_offerings TEXT[];
  result JSON;
BEGIN
  -- Get current request details
  SELECT r.status, r.assignee_id, r.original_assignee_id, r.advisory_services, 
         COALESCE(r.service_specific_data->>'selectedServiceOfferings', '[]')::text[]
  INTO current_status, current_assignee_id, original_assignee_id, request_advisory_services, request_service_offerings
  FROM requests r
  WHERE r.id = p_request_id;
  
  -- Check if request exists
  IF current_status IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Request not found');
  END IF;
  
  -- Special case: Pending Review to Reject - keep current assignee
  IF current_status = 'Pending Review' AND new_status = 'Reject' THEN
    new_assignee_id := current_assignee_id;
  -- Special case: Pending Review to New - assign to Advisory Consultant with expertise matching service offering, exclude original assignee
  ELSIF current_status = 'Pending Review' AND new_status = 'New' THEN
    -- Find Advisory Consultant with expertise matching service offering, excluding original assignee
    SELECT atm.user_id INTO new_assignee_id
    FROM advisory_team_members atm
    LEFT JOIN requests r ON r.assignee_id = atm.user_id AND r.status NOT IN ('Implemented', 'Reject')
    WHERE atm.title = 'Advisory Consultant'
      AND atm.is_active = true
      AND atm.user_id != COALESCE(original_assignee_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (array_length(request_service_offerings, 1) > 0 AND request_service_offerings && atm.expertise)
    GROUP BY atm.user_id
    ORDER BY COUNT(r.id) ASC
    LIMIT 1;
    
    -- If no match found, get any Advisory Consultant except original
    IF new_assignee_id IS NULL THEN
      SELECT atm.user_id INTO new_assignee_id
      FROM advisory_team_members atm
      LEFT JOIN requests r ON r.assignee_id = atm.user_id AND r.status NOT IN ('Implemented', 'Reject')
      WHERE atm.title = 'Advisory Consultant'
        AND atm.is_active = true
        AND atm.user_id != COALESCE(original_assignee_id, '00000000-0000-0000-0000-000000000000'::uuid)
      GROUP BY atm.user_id
      ORDER BY COUNT(r.id) ASC
      LIMIT 1;
    END IF;
  -- Special case: Approval to Estimation or Implementing - assign back to original assignee
  ELSIF current_status = 'Approval' AND new_status IN ('Estimation', 'Implementing') THEN
    new_assignee_id := original_assignee_id;
  ELSE
    -- Normal workflow: determine required role for the new status
    SELECT role_required INTO consultant_role
    FROM status_transitions 
    WHERE from_status = current_status AND to_status = new_status;
    
    -- If no transition rule found, keep current assignee
    IF consultant_role IS NULL THEN
      new_assignee_id := current_assignee_id;
    ELSE
      -- Use the updated get_next_assignee function
      new_assignee_id := get_next_assignee(request_advisory_services, consultant_role, original_assignee_id);
      
      -- If no assignee found, return error
      IF new_assignee_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'No available consultants with required role: ' || consultant_role);
      END IF;
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
  
  -- Add status history entry
  INSERT INTO request_history (request_id, action, old_value, new_value, performed_by)
  VALUES (p_request_id, 'Status changed', current_status, new_status, performed_by);
  
  -- Add assignee history if assignee changed
  IF current_assignee_id IS DISTINCT FROM new_assignee_id THEN
    -- Mark previous assignment as ended
    IF current_assignee_id IS NOT NULL THEN
      UPDATE request_assignee_history 
      SET unassigned_at = now(),
          status_at_unassignment = new_status
      WHERE request_id = p_request_id AND assignee_id = current_assignee_id AND unassigned_at IS NULL;
    END IF;
    
    -- Add new assignment
    IF new_assignee_id IS NOT NULL THEN
      INSERT INTO request_assignee_history (request_id, assignee_id, assigned_at, status_at_assignment)
      VALUES (p_request_id, new_assignee_id, now(), new_status);
    END IF;
    
    -- Log the assignee change
    INSERT INTO request_history (request_id, action, old_value, new_value, performed_by)
    VALUES (p_request_id, 'Reassigned', current_assignee_id::text, new_assignee_id::text, performed_by);
  END IF;
  
  -- Return success with reassignment info
  IF current_assignee_id IS DISTINCT FROM new_assignee_id THEN
    result := json_build_object('success', true, 'reassigned', true, 'new_assignee_id', new_assignee_id);
  ELSE
    result := json_build_object('success', true, 'reassigned', false);
  END IF;
  
  RETURN result;
END;
$function$;