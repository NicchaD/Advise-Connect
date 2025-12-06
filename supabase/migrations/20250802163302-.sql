-- Create advisory_services table
CREATE TABLE public.advisory_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service_offerings table
CREATE TABLE public.service_offerings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advisory_service_id UUID NOT NULL REFERENCES public.advisory_services(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.advisory_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_offerings ENABLE ROW LEVEL SECURITY;

-- RLS policies for advisory_services
CREATE POLICY "All authenticated users can view active advisory services"
ON public.advisory_services
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Admins can manage advisory services"
ON public.advisory_services
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'Admin'
));

-- RLS policies for service_offerings
CREATE POLICY "All authenticated users can view active service offerings"
ON public.service_offerings
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Admins can manage service offerings"
ON public.service_offerings
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'Admin'
));

-- Add triggers for timestamp updates
CREATE TRIGGER update_advisory_services_updated_at
BEFORE UPDATE ON public.advisory_services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_offerings_updated_at
BEFORE UPDATE ON public.service_offerings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial advisory services
INSERT INTO public.advisory_services (name, description, icon, display_order) VALUES
('Engineering Excellence', 'Enhance your engineering practices and capabilities', 'Code', 1),
('Innovation Management', 'Drive innovation and manage your innovation pipeline', 'Lightbulb', 2),
('Delivery Transformation and Governance Service', 'Transform your delivery processes and governance', 'Truck', 3),
('Deep Dive Assessment', 'Comprehensive assessment of your current state', 'Search', 4),
('Process Consulting', 'Optimize and improve your business processes', 'Settings', 5),
('Knowledge Management', 'Manage and leverage your organizational knowledge', 'BookOpen', 6);

-- Insert initial service offerings
WITH service_ids AS (
  SELECT id, name FROM public.advisory_services
)
INSERT INTO public.service_offerings (advisory_service_id, name, description, icon, display_order)
SELECT 
  s.id,
  offering.name,
  offering.description,
  offering.icon,
  offering.display_order
FROM service_ids s
CROSS JOIN (
  VALUES
    ('Code Review & Best Practices', 'Comprehensive code review and engineering best practices assessment', 'FileCheck', 1),
    ('Architecture Assessment', 'Evaluation of your current architecture and recommendations', 'Building', 2),
    ('DevOps & CI/CD Setup', 'Implementation of DevOps practices and CI/CD pipelines', 'GitBranch', 3),
    ('Technical Debt Analysis', 'Identification and prioritization of technical debt', 'AlertTriangle', 4)
) AS offering(name, description, icon, display_order)
WHERE s.name = 'Engineering Excellence'

UNION ALL

SELECT 
  s.id,
  offering.name,
  offering.description,
  offering.icon,
  offering.display_order
FROM service_ids s
CROSS JOIN (
  VALUES
    ('Innovation Strategy', 'Develop comprehensive innovation strategies', 'Target', 1),
    ('Idea Management', 'Implement systems for capturing and managing ideas', 'Lightbulb', 2),
    ('Innovation Workshops', 'Facilitate innovation workshops and ideation sessions', 'Users', 3),
    ('Innovation Metrics', 'Establish metrics and KPIs for innovation tracking', 'BarChart', 4)
) AS offering(name, description, icon, display_order)
WHERE s.name = 'Innovation Management'

UNION ALL

SELECT 
  s.id,
  offering.name,
  offering.description,
  offering.icon,
  offering.display_order
FROM service_ids s
CROSS JOIN (
  VALUES
    ('Delivery Process Optimization', 'Optimize your delivery processes for better outcomes', 'Zap', 1),
    ('Governance Framework', 'Establish robust governance frameworks', 'Shield', 2),
    ('Quality Assurance', 'Implement comprehensive quality assurance processes', 'CheckCircle', 3),
    ('Risk Management', 'Identify and mitigate delivery risks', 'AlertCircle', 4)
) AS offering(name, description, icon, display_order)
WHERE s.name = 'Delivery Transformation and Governance Service'

UNION ALL

SELECT 
  s.id,
  offering.name,
  offering.description,
  offering.icon,
  offering.display_order
FROM service_ids s
CROSS JOIN (
  VALUES
    ('Current State Analysis', 'Comprehensive analysis of your current state', 'Search', 1),
    ('Gap Analysis', 'Identify gaps between current and desired state', 'GitCompare', 2),
    ('Capability Assessment', 'Assess organizational capabilities and maturity', 'Award', 3),
    ('Recommendations Report', 'Detailed recommendations for improvement', 'FileText', 4)
) AS offering(name, description, icon, display_order)
WHERE s.name = 'Deep Dive Assessment'

UNION ALL

SELECT 
  s.id,
  offering.name,
  offering.description,
  offering.icon,
  offering.display_order
FROM service_ids s
CROSS JOIN (
  VALUES
    ('Process Mapping', 'Map and document your current processes', 'Map', 1),
    ('Process Optimization', 'Optimize processes for efficiency and effectiveness', 'TrendingUp', 2),
    ('Change Management', 'Manage organizational change effectively', 'RefreshCw', 3),
    ('Training & Development', 'Provide training on new processes', 'GraduationCap', 4)
) AS offering(name, description, icon, display_order)
WHERE s.name = 'Process Consulting'

UNION ALL

SELECT 
  s.id,
  offering.name,
  offering.description,
  offering.icon,
  offering.display_order
FROM service_ids s
CROSS JOIN (
  VALUES
    ('Knowledge Audit', 'Audit your current knowledge assets', 'Search', 1),
    ('Knowledge Base Setup', 'Establish comprehensive knowledge bases', 'Database', 2),
    ('Documentation Standards', 'Create and implement documentation standards', 'FileText', 3),
    ('Knowledge Sharing Culture', 'Foster a culture of knowledge sharing', 'Share2', 4)
) AS offering(name, description, icon, display_order)
WHERE s.name = 'Knowledge Management';