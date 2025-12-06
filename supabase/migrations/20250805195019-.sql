-- Update the status check constraint to include "Approval" as a valid status
ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_status_check;

-- Add the updated constraint with "Approval" included
ALTER TABLE requests ADD CONSTRAINT requests_status_check 
CHECK (status IN ('New', 'Estimation', 'Review', 'Approval', 'Implementing', 'Implemented', 'Reject', 'Closed', 'Cancelled'));