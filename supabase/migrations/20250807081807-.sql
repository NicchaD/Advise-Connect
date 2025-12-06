-- Update the status transition from Review to Approval to require Advisory Service Head instead of Advisory Service Lead
UPDATE status_transitions 
SET role_required = 'Advisory Service Head'
WHERE from_status = 'Review' AND to_status = 'Approval';