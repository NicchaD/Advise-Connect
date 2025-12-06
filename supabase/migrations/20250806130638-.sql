-- Create activities table
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  estimated_hours INTEGER NOT NULL DEFAULT 0,
  service_offering_id UUID REFERENCES public.service_offerings(id),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sub_activities table
CREATE TABLE public.sub_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  estimated_hours INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for activities
CREATE POLICY "All authenticated users can view active activities" 
ON public.activities 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Admins can manage activities" 
ON public.activities 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'Admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'Admin'
));

-- Create policies for sub_activities
CREATE POLICY "All authenticated users can view active sub_activities" 
ON public.sub_activities 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Admins can manage sub_activities" 
ON public.sub_activities 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'Admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'Admin'
));

-- Create triggers for updated_at
CREATE TRIGGER update_activities_updated_at
BEFORE UPDATE ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sub_activities_updated_at
BEFORE UPDATE ON public.sub_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default activities for service offerings
-- JIRA (assuming service offering ID)
WITH jira_service AS (
  SELECT id FROM public.service_offerings WHERE name = 'JIRA' LIMIT 1
)
INSERT INTO public.activities (name, estimated_hours, service_offering_id, display_order) 
SELECT * FROM (VALUES 
  ('Project Setup', 24, (SELECT id FROM jira_service), 1),
  ('Issue Management', 20, (SELECT id FROM jira_service), 2),
  ('Reporting & Dashboards', 28, (SELECT id FROM jira_service), 3),
  ('Integration & Automation', 32, (SELECT id FROM jira_service), 4)
) AS v(name, estimated_hours, service_offering_id, display_order)
WHERE (SELECT id FROM jira_service) IS NOT NULL;

-- Insert JIRA sub-activities
WITH project_setup AS (
  SELECT a.id FROM public.activities a 
  JOIN public.service_offerings so ON a.service_offering_id = so.id 
  WHERE a.name = 'Project Setup' AND so.name = 'JIRA' LIMIT 1
)
INSERT INTO public.sub_activities (activity_id, name, estimated_hours, display_order)
SELECT * FROM (VALUES 
  ((SELECT id FROM project_setup), 'Create JIRA Project', 4, 1),
  ((SELECT id FROM project_setup), 'Configure Workflows', 8, 2),
  ((SELECT id FROM project_setup), 'Setup Permissions', 6, 3),
  ((SELECT id FROM project_setup), 'Create Custom Fields', 6, 4)
) AS v(activity_id, name, estimated_hours, display_order)
WHERE (SELECT id FROM project_setup) IS NOT NULL;

-- Default activities for services without specific service offerings
INSERT INTO public.activities (name, estimated_hours, service_offering_id, display_order) VALUES 
('Requirements Analysis', 24, NULL, 1),
('Solution Design', 32, NULL, 2),
('Implementation', 48, NULL, 3),
('Delivery & Support', 20, NULL, 4);

-- Insert default sub-activities for Requirements Analysis
WITH req_analysis AS (
  SELECT id FROM public.activities WHERE name = 'Requirements Analysis' AND service_offering_id IS NULL LIMIT 1
)
INSERT INTO public.sub_activities (activity_id, name, estimated_hours, display_order)
SELECT * FROM (VALUES 
  ((SELECT id FROM req_analysis), 'Gather Requirements', 8, 1),
  ((SELECT id FROM req_analysis), 'Analyze Requirements', 6, 2),
  ((SELECT id FROM req_analysis), 'Document Requirements', 5, 3),
  ((SELECT id FROM req_analysis), 'Validate Requirements', 5, 4)
) AS v(activity_id, name, estimated_hours, display_order)
WHERE (SELECT id FROM req_analysis) IS NOT NULL;