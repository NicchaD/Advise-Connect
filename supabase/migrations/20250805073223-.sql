-- Add status transitions table to track workflow
CREATE TABLE public.status_transitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  role_required TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert the workflow transitions
INSERT INTO public.status_transitions (from_status, to_status, role_required) VALUES
('New', 'Estimation', 'Advisory Consultant'),
('New', 'Pending Review', 'Advisory Consultant'),
('Estimation', 'Review', 'Advisory Consultant'),
('Pending Review', 'Reject', 'Advisory Service Head'),
('Pending Review', 'New', 'Advisory Service Head'),
('Review', 'Approval', 'Advisory Service Lead'),
('Review', 'Estimation', 'Advisory Service Lead'),
('Approval', 'Review', 'Advisory Service Head'),
('Approval', 'Implementing', 'Advisory Service Head'),
('Approval', 'Estimation', 'Advisory Service Head'),
('Implementing', 'Awaiting Feedback', 'Advisory Consultant'),
('Awaiting Feedback', 'Feedback Received', 'Requestor'),
('Feedback Received', 'Implemented', 'Advisory Consultant');

-- Enable RLS on status_transitions
ALTER TABLE public.status_transitions ENABLE ROW LEVEL SECURITY;

-- Policy for viewing transitions
CREATE POLICY "All authenticated users can view transitions"
ON public.status_transitions
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Add original_assignee_id to requests table to track initial consultant
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS original_assignee_id UUID;

-- Update existing requests to set original_assignee_id
UPDATE public.requests 
SET original_assignee_id = assignee_id 
WHERE original_assignee_id IS NULL AND assignee_id IS NOT NULL;

-- Create function to get next available assignee based on status and advisory service
CREATE OR REPLACE FUNCTION public.get_next_assignee(
  request_advisory_services TEXT[],
  target_role TEXT,
  original_assignee UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  assignee_id UUID;
  service_name TEXT;
BEGIN
  -- If requesting original assignee, return it
  IF target_role = 'Original Advisory Consultant' AND original_assignee IS NOT NULL THEN
    RETURN original_assignee;
  END IF;

  -- Get the first advisory service from the request
  IF array_length(request_advisory_services, 1) > 0 THEN
    service_name := request_advisory_services[1];
    
    -- Find assignee with matching role and advisory service, with least assignments
    SELECT atm.user_id INTO assignee_id
    FROM advisory_team_members atm
    LEFT JOIN requests r ON r.assignee_id = atm.user_id AND r.status NOT IN ('Implemented', 'Reject')
    WHERE atm.title = target_role 
      AND atm.is_active = true
      AND service_name = ANY(atm.advisory_services)
    GROUP BY atm.user_id
    ORDER BY COUNT(r.id) ASC
    LIMIT 1;
  END IF;

  -- If no specific match found, get any user with the target role
  IF assignee_id IS NULL THEN
    SELECT atm.user_id INTO assignee_id
    FROM advisory_team_members atm
    LEFT JOIN requests r ON r.assignee_id = atm.user_id AND r.status NOT IN ('Implemented', 'Reject')
    WHERE atm.title = target_role 
      AND atm.is_active = true
    GROUP BY atm.user_id
    ORDER BY COUNT(r.id) ASC
    LIMIT 1;
  END IF;

  RETURN assignee_id;
END;
$$;

-- Create function to handle status transitions and assignee updates
CREATE OR REPLACE FUNCTION public.update_request_status_and_assignee(
  request_id UUID,
  new_status TEXT,
  performed_by UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_request RECORD;
  new_assignee_id UUID;
  target_role TEXT;
BEGIN
  -- Get current request details
  SELECT * INTO current_request FROM requests WHERE id = request_id;
  
  -- Determine target role based on new status
  CASE new_status
    WHEN 'Pending Review' THEN target_role := 'Advisory Service Head';
    WHEN 'Review' THEN target_role := 'Advisory Service Lead';
    WHEN 'Approval' THEN target_role := 'Advisory Service Head';
    WHEN 'Implementing' THEN target_role := 'Original Advisory Consultant';
    WHEN 'Awaiting Feedback' THEN new_assignee_id := current_request.requestor_id;
    WHEN 'Feedback Received' THEN target_role := 'Original Advisory Consultant';
    ELSE new_assignee_id := current_request.assignee_id; -- Keep current assignee
  END CASE;

  -- Get new assignee if target role is specified
  IF target_role IS NOT NULL AND new_assignee_id IS NULL THEN
    IF target_role = 'Original Advisory Consultant' THEN
      new_assignee_id := get_next_assignee(current_request.advisory_services, target_role, current_request.original_assignee_id);
    ELSE
      new_assignee_id := get_next_assignee(current_request.advisory_services, target_role);
    END IF;
  END IF;

  -- Update request with new status and assignee
  UPDATE requests 
  SET 
    status = new_status,
    assignee_id = COALESCE(new_assignee_id, assignee_id),
    updated_at = now()
  WHERE id = request_id;

  -- Log the transition in request history
  INSERT INTO request_history (request_id, action, old_value, new_value, performed_by)
  VALUES (request_id, 'Status changed', current_request.status, new_status, performed_by);

  IF new_assignee_id IS NOT NULL AND new_assignee_id != current_request.assignee_id THEN
    INSERT INTO request_history (request_id, action, old_value, new_value, performed_by)
    VALUES (request_id, 'Reassigned', current_request.assignee_id::text, new_assignee_id::text, performed_by);
  END IF;

  RETURN TRUE;
END;
$$;