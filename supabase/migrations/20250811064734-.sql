-- Fix the issue: Make service_specific_data nullable to prevent constraint violations
-- and ensure the trigger doesn't interfere with the data
ALTER TABLE requests ALTER COLUMN service_specific_data DROP NOT NULL;

-- Update the auto assignment trigger to ensure it doesn't overwrite service_specific_data
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
    -- Ensure service_specific_data exists and get selected offerings
    IF NEW.service_specific_data IS NOT NULL THEN
      -- Try to get selectedOfferings from service_specific_data
      IF NEW.service_specific_data ? 'selectedOfferings' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(NEW.service_specific_data->'selectedOfferings')) INTO service_offerings_array;
      ELSE
        service_offerings_array := '{}';
      END IF;
    ELSE
      -- If service_specific_data is null, use selected_tools as fallback
      service_offerings_array := NEW.selected_tools;
    END IF;
    
    -- Get the advisory service name
    IF array_length(NEW.advisory_services, 1) > 0 THEN
      SELECT name INTO service_name
      FROM advisory_services
      WHERE id = NEW.advisory_services[1]::uuid;
      
      -- First priority: Find Advisory Consultant with matching advisory service and expertise
      SELECT atm.user_id INTO assigned_consultant_id
      FROM advisory_team_members atm
      LEFT JOIN requests r ON r.assignee_id = atm.user_id AND r.status NOT IN ('Implemented', 'Reject', 'Cancelled')
      WHERE atm.title = 'Advisory Consultant'
        AND atm.is_active = true
        AND NEW.advisory_services[1] = ANY(atm.advisory_services)
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
          AND NEW.advisory_services[1] = ANY(atm.advisory_services)
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
          AND NEW.advisory_services[1] = ANY(atm.advisory_services)
        GROUP BY atm.user_id
        ORDER BY COUNT(r.id) ASC
        LIMIT 1;
      END IF;
    END IF;
    
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
      
      -- Update service_specific_data with assigned consultant name only if it exists
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