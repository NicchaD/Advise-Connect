-- Fix the auto_assign_new_request trigger to properly update current_assignee_name
CREATE OR REPLACE FUNCTION public.auto_assign_new_request()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  assigned_consultant_id UUID;
  assigned_consultant_name TEXT;
  service_name TEXT;
  service_offerings_array TEXT[];
BEGIN
  -- Only auto-assign for new requests with status 'New' and no existing assignee
  IF NEW.status = 'New' AND NEW.assignee_id IS NULL THEN
    -- Get service offerings from service_specific_data or selected_tools
    IF NEW.service_specific_data IS NOT NULL AND NEW.service_specific_data ? 'selectedOfferings' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(NEW.service_specific_data->'selectedOfferings')) INTO service_offerings_array;
    ELSE
      service_offerings_array := NEW.selected_tools;
    END IF;
    
    -- Get the advisory service name
    IF array_length(NEW.advisory_services, 1) > 0 THEN
      SELECT NEW.advisory_services[1] INTO service_name;
      
      -- First priority: Find Advisory Consultant with matching advisory service and expertise
      SELECT atm.user_id INTO assigned_consultant_id
      FROM advisory_team_members atm
      LEFT JOIN requests r ON r.assignee_id = atm.user_id AND r.status NOT IN ('Implemented', 'Reject', 'Cancelled')
      WHERE atm.title = 'Advisory Consultant'
        AND atm.is_active = true
        AND service_name = ANY(atm.advisory_services)
        AND (array_length(service_offerings_array, 1) > 0 AND service_offerings_array && atm.expertise)
      GROUP BY atm.user_id
      ORDER BY COUNT(r.id) ASC
      LIMIT 1;
      
      -- Second priority: If no expertise match found, get any Advisory Consultant in the same advisory service
      IF assigned_consultant_id IS NULL THEN
        SELECT atm.user_id INTO assigned_consultant_id
        FROM advisory_team_members atm
        LEFT JOIN requests r ON r.assignee_id = atm.user_id AND r.status NOT IN ('Implemented', 'Reject', 'Cancelled')
        WHERE atm.title = 'Advisory Consultant'
          AND atm.is_active = true
          AND service_name = ANY(atm.advisory_services)
        GROUP BY atm.user_id
        ORDER BY COUNT(r.id) ASC
        LIMIT 1;
      END IF;
      
      -- Third priority: If no Advisory Consultant found, assign to Advisory Service Head for the same advisory service
      IF assigned_consultant_id IS NULL THEN
        SELECT atm.user_id INTO assigned_consultant_id
        FROM advisory_team_members atm
        LEFT JOIN requests r ON r.assignee_id = atm.user_id AND r.status NOT IN ('Implemented', 'Reject', 'Cancelled')
        WHERE atm.title = 'Advisory Service Head'
          AND atm.is_active = true
          AND service_name = ANY(atm.advisory_services)
        GROUP BY atm.user_id
        ORDER BY COUNT(r.id) ASC
        LIMIT 1;
      END IF;
    END IF;
    
    -- If we found a consultant, assign them and set all name fields
    IF assigned_consultant_id IS NOT NULL THEN
      -- Get the consultant's name
      SELECT name INTO assigned_consultant_name
      FROM advisory_team_members
      WHERE user_id = assigned_consultant_id;
      
      -- Set all the assignee fields
      NEW.assignee_id := assigned_consultant_id;
      NEW.original_assignee_id := assigned_consultant_id;
      NEW.current_assignee_name := assigned_consultant_name;
      NEW.original_assignee_name := assigned_consultant_name;
      NEW.assigned_consultant_name := assigned_consultant_name;
      
      -- Update service_specific_data with assigned consultant name if it exists
      IF NEW.service_specific_data IS NOT NULL THEN
        NEW.service_specific_data := jsonb_set(
          NEW.service_specific_data,
          '{assignedConsultant}',
          to_jsonb(assigned_consultant_name)
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;