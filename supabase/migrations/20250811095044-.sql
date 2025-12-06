-- Update the Review to Estimation transition to require Advisory Service Head or Advisory Service Lead
UPDATE status_transitions 
SET role_required = 'Advisory Service Head'
WHERE from_status = 'Review' AND to_status = 'Estimation';

-- Add another transition for Advisory Service Lead
INSERT INTO status_transitions (from_status, to_status, role_required)
VALUES ('Review', 'Estimation', 'Advisory Service Lead')
ON CONFLICT DO NOTHING;