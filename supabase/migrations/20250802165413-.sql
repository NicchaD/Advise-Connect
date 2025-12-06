-- Update Engineering Excellence service offerings
DELETE FROM public.service_offerings WHERE advisory_service_id = (
  SELECT id FROM public.advisory_services WHERE name = 'Engineering Excellence'
);

-- Insert the new Engineering Excellence service offerings
INSERT INTO public.service_offerings (advisory_service_id, name, description, icon, display_order, is_active)
SELECT 
  s.id as advisory_service_id,
  offering_data.name,
  offering_data.description,
  offering_data.icon,
  offering_data.display_order,
  true as is_active
FROM 
  public.advisory_services s,
  (VALUES 
    ('GitHub', 'Version control and collaboration platform', 'Github', 1),
    ('Jenkins', 'Continuous integration and delivery platform', 'Wrench', 2),
    ('Azure DevOps', 'Development and deployment platform', 'GitBranch', 3),
    ('JIRA', 'Project management and issue tracking', 'Bug', 4),
    ('SonarQube', 'Code quality and security analysis', 'Shield', 5),
    ('JUnit', 'Java unit testing framework', 'TestTube', 6),
    ('NUnit', '.NET unit testing framework', 'TestTube', 7)
  ) AS offering_data(name, description, icon, display_order)
WHERE s.name = 'Engineering Excellence';