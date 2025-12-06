-- Update the status transition from "New" -> "Estimation" to "New" -> "Under Discussion"
UPDATE status_transitions 
SET to_status = 'Under Discussion'
WHERE from_status = 'New' AND to_status = 'Estimation';