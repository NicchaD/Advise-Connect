-- First, let's drop any existing status check constraints and create a new one with all valid statuses
ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS requests_status_check;

-- Add a comprehensive check constraint for all workflow statuses
ALTER TABLE public.requests ADD CONSTRAINT requests_status_check 
CHECK (status IN (
  'New', 
  'Estimation', 
  'Review', 
  'Pending Review', 
  'Pending Review by Advisory Head', 
  'Approved by Advisory Head', 
  'Implementing', 
  'Awaiting Feedback', 
  'Closed', 
  'On Hold', 
  'Cancelled'
));

-- Now update existing requests to use the new status values
UPDATE requests SET status = 'New' WHERE status = 'Submitted';

-- Add a trigger to automatically set new requests to 'New' status
CREATE OR REPLACE FUNCTION public.set_new_request_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Set status to 'New' for new requests if not specified
  IF NEW.status IS NULL OR NEW.status = '' THEN
    NEW.status = 'New';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically set status for new requests
DROP TRIGGER IF EXISTS set_request_status_trigger ON public.requests;
CREATE TRIGGER set_request_status_trigger
  BEFORE INSERT ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_new_request_status();