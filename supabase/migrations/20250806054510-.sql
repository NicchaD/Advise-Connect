-- Add "Under Discussion" to the allowed status values in the requests table constraint
ALTER TABLE requests DROP CONSTRAINT requests_status_check;

ALTER TABLE requests ADD CONSTRAINT requests_status_check 
CHECK (status = ANY (ARRAY[
  'New'::text, 
  'Under Discussion'::text,
  'Estimation'::text, 
  'Review'::text, 
  'Approval'::text, 
  'Implementing'::text, 
  'Implemented'::text, 
  'Reject'::text, 
  'Closed'::text, 
  'Cancelled'::text, 
  'Approved by Advisory Head'::text, 
  'Awaiting Feedback'::text, 
  'Feedback Received'::text, 
  'Pending Review'::text, 
  'Pending Review by Advisory Head'::text
]));