-- Update the status check constraint to include all current and new status values
ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_status_check;

-- Add the updated constraint with all valid statuses including "Approval"
ALTER TABLE requests ADD CONSTRAINT requests_status_check 
CHECK (status IN (
  'New', 
  'Estimation', 
  'Review', 
  'Approval', 
  'Implementing', 
  'Implemented', 
  'Reject', 
  'Closed', 
  'Cancelled',
  'Approved by Advisory Head',
  'Awaiting Feedback',
  'Pending Review',
  'Pending Review by Advisory Head'
));