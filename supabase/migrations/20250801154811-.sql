-- Add title field to profiles table
ALTER TABLE public.profiles ADD COLUMN title TEXT;

-- Create table for managing dropdown values
CREATE TABLE public.dropdown_values (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    category TEXT NOT NULL,
    value TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(category, value)
);

-- Enable RLS on dropdown_values
ALTER TABLE public.dropdown_values ENABLE ROW LEVEL SECURITY;

-- Create policies for dropdown_values
CREATE POLICY "Admins can manage dropdown values" 
ON public.dropdown_values 
FOR ALL 
USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'Admin'
));

CREATE POLICY "All authenticated users can view dropdown values" 
ON public.dropdown_values 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_active = true);

-- Create table for advisory team members
CREATE TABLE public.advisory_team_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    department TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on advisory_team_members
ALTER TABLE public.advisory_team_members ENABLE ROW LEVEL SECURITY;

-- Create policies for advisory_team_members
CREATE POLICY "Admins can manage advisory team members" 
ON public.advisory_team_members 
FOR ALL 
USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'Admin'
));

CREATE POLICY "All authenticated users can view advisory team members" 
ON public.advisory_team_members 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_active = true);

-- Create table for system settings
CREATE TABLE public.system_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for system_settings
CREATE POLICY "Admins can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'Admin'
));

-- Add trigger for updating timestamps
CREATE TRIGGER update_dropdown_values_updated_at
BEFORE UPDATE ON public.dropdown_values
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_advisory_team_members_updated_at
BEFORE UPDATE ON public.advisory_team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default dropdown values
INSERT INTO public.dropdown_values (category, value, display_order) VALUES
('advisory_services', 'Strategic Planning', 1),
('advisory_services', 'Risk Management', 2),
('advisory_services', 'Business Process Optimization', 3),
('advisory_services', 'Technology Advisory', 4),
('advisory_services', 'Financial Advisory', 5),
('advisory_services', 'Compliance Advisory', 6),
('tools', 'PowerBI', 1),
('tools', 'Tableau', 2),
('tools', 'Excel Advanced Analytics', 3),
('tools', 'Python Analytics', 4),
('tools', 'R Analytics', 5),
('tools', 'SQL Database Analysis', 6),
('user_titles', 'Advisory Service Head', 1),
('user_titles', 'Advisory Service Lead', 2),
('user_titles', 'Advisory Consultant', 3),
('user_titles', 'Stakeholder', 4),
('user_roles', 'Admin', 1),
('user_roles', 'Standard User', 2);

-- Insert default system setting for Advisory Service Team DL
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('advisory_team_dl_email', '', 'Email address for Advisory Service Team Distribution List');