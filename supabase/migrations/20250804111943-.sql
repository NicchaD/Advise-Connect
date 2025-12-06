-- Temporarily disable the request change logging trigger
DROP TRIGGER IF EXISTS log_request_changes_trigger ON public.requests;

-- Drop the existing status check constraint
ALTER TABLE public.requests DROP CONSTRAINT requests_status_check;

-- Update all existing statuses to match our new workflow
UPDATE requests SET status = 'New' WHERE status = 'Submitted';
UPDATE requests SET status = 'Approved by Advisory Head' WHERE status = 'Approved';
UPDATE requests SET status = 'Review' WHERE status = 'Under Review';
UPDATE requests SET status = 'Implementing' WHERE status = 'In Progress';
UPDATE requests SET status = 'Closed' WHERE status = 'Completed';
UPDATE requests SET status = 'Cancelled' WHERE status = 'Rejected';

-- Now add the comprehensive check constraint for all workflow statuses
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

-- Add a trigger to automatically set new requests to 'New' status
CREATE OR REPLACE FUNCTION public.set_new_request_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Set status to 'New' for new requests if not specified
  IF NEW.status IS NULL OR NEW.status = '' OR NEW.status = 'Submitted' THEN
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

-- Re-enable the request change logging trigger
CREATE TRIGGER log_request_changes_trigger
  AFTER UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_request_changes();