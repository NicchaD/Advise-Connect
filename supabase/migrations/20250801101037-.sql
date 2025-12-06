-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Standard User' CHECK (role IN ('Admin', 'Advisory Consultant', 'Advisory Lead', 'Advisory Head', 'Standard User')),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create requests table for storing all service requests
CREATE TABLE public.requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  requestor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES auth.users(id),
  advisory_services TEXT[] NOT NULL,
  selected_tools TEXT[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'In Progress', 'Under Review', 'Approved', 'Rejected', 'Completed')),
  description TEXT,
  project_data JSONB NOT NULL,
  service_specific_data JSONB NOT NULL,
  submission_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create request_history table for audit trail
CREATE TABLE public.request_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comments table for request comments
CREATE TABLE public.request_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'Admin'
  )
);

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'Admin'
  )
);

CREATE POLICY "Admins can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'Admin'
  )
);

CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'Admin'
  )
);

-- Requests policies
CREATE POLICY "Users can view their own requests" 
ON public.requests 
FOR SELECT 
USING (auth.uid() = requestor_id OR auth.uid() = assignee_id);

CREATE POLICY "Admins and consultants can view all requests" 
ON public.requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('Admin', 'Advisory Consultant', 'Advisory Lead', 'Advisory Head')
  )
);

CREATE POLICY "Users can insert their own requests" 
ON public.requests 
FOR INSERT 
WITH CHECK (auth.uid() = requestor_id);

CREATE POLICY "Admins and assignees can update requests" 
ON public.requests 
FOR UPDATE 
USING (
  auth.uid() = assignee_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'Admin'
  )
);

-- Request history policies
CREATE POLICY "Users can view history of their requests" 
ON public.request_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.requests 
    WHERE id = request_history.request_id 
    AND (requestor_id = auth.uid() OR assignee_id = auth.uid())
  )
);

CREATE POLICY "Admins and consultants can view all history" 
ON public.request_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('Admin', 'Advisory Consultant', 'Advisory Lead', 'Advisory Head')
  )
);

CREATE POLICY "Authenticated users can insert history" 
ON public.request_history 
FOR INSERT 
WITH CHECK (auth.uid() = performed_by);

-- Comments policies
CREATE POLICY "Users can view comments on their requests" 
ON public.request_comments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.requests 
    WHERE id = request_comments.request_id 
    AND (requestor_id = auth.uid() OR assignee_id = auth.uid())
  )
);

CREATE POLICY "Admins and consultants can view all comments" 
ON public.request_comments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('Admin', 'Advisory Consultant', 'Advisory Lead', 'Advisory Head')
  )
);

CREATE POLICY "Users can insert comments on accessible requests" 
ON public.request_comments 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.requests 
    WHERE id = request_comments.request_id 
    AND (requestor_id = auth.uid() OR assignee_id = auth.uid() OR 
         EXISTS (
           SELECT 1 FROM public.profiles 
           WHERE user_id = auth.uid() 
           AND role IN ('Admin', 'Advisory Consultant', 'Advisory Lead', 'Advisory Head')
         ))
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to log request changes
CREATE OR REPLACE FUNCTION public.log_request_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.request_history (request_id, action, old_value, new_value, performed_by)
    VALUES (NEW.id, 'Status changed', OLD.status, NEW.status, auth.uid());
  END IF;
  
  -- Log assignee changes
  IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
    INSERT INTO public.request_history (request_id, action, old_value, new_value, performed_by)
    VALUES (NEW.id, 'Reassigned', OLD.assignee_id::text, NEW.assignee_id::text, auth.uid());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for request change logging
CREATE TRIGGER log_request_changes_trigger
  AFTER UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_request_changes();

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_status ON public.profiles(status);
CREATE INDEX idx_requests_requestor_id ON public.requests(requestor_id);
CREATE INDEX idx_requests_assignee_id ON public.requests(assignee_id);
CREATE INDEX idx_requests_status ON public.requests(status);
CREATE INDEX idx_requests_submission_date ON public.requests(submission_date);
CREATE INDEX idx_request_history_request_id ON public.request_history(request_id);
CREATE INDEX idx_request_comments_request_id ON public.request_comments(request_id);