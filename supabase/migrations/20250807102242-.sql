-- Update the status transition from Estimation to Review to assign to Advisory Service Head
UPDATE status_transitions 
SET role_required = 'Advisory Service Head'
WHERE from_status = 'Estimation' AND to_status = 'Review';