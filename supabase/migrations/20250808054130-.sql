-- Add status transition from New to Pending Review for Advisory Consultant
INSERT INTO status_transitions (from_status, to_status, role_required)
VALUES ('New', 'Pending Review', 'Advisory Consultant')
ON CONFLICT DO NOTHING;