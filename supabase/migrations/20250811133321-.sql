-- Update existing status records from "Approval" to "Approved"
UPDATE requests 
SET status = 'Approved' 
WHERE status = 'Approval';

-- Update status transitions to use "Approved" instead of "Approval"
UPDATE status_transitions 
SET from_status = 'Approved' 
WHERE from_status = 'Approval';

UPDATE status_transitions 
SET to_status = 'Approved' 
WHERE to_status = 'Approval';

-- Update request history records to use "Approved" instead of "Approval"
UPDATE request_history 
SET old_value = 'Approved' 
WHERE old_value = 'Approval' AND action = 'Status changed';

UPDATE request_history 
SET new_value = 'Approved' 
WHERE new_value = 'Approval' AND action = 'Status changed';

-- Update request assignee history to use "Approved" instead of "Approval"
UPDATE request_assignee_history 
SET status_at_assignment = 'Approved' 
WHERE status_at_assignment = 'Approval';

UPDATE request_assignee_history 
SET status_at_unassignment = 'Approved' 
WHERE status_at_unassignment = 'Approval';