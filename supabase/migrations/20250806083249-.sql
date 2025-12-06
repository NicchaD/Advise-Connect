-- Create table to track request assignee history for "My Queue" functionality
CREATE TABLE public.request_assignee_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL,
  assignee_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unassigned_at TIMESTAMP WITH TIME ZONE NULL,
  status_at_assignment TEXT NOT NULL,
  status_at_unassignment TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on the new table
ALTER TABLE public.request_assignee_history ENABLE ROW LEVEL SECURITY;

-- Create policies for request assignee history
CREATE POLICY "Users can view their assignee history" 
ON public.request_assignee_history 
FOR SELECT 
USING (
  assignee_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'Admin'
  )
);

CREATE POLICY "System can insert assignee history" 
ON public.request_assignee_history 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update assignee history" 
ON public.request_assignee_history 
FOR UPDATE 
USING (true);

-- Create trigger to automatically track assignee changes
CREATE OR REPLACE FUNCTION public.track_request_assignee_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is an INSERT with an assignee, create initial history record
  IF TG_OP = 'INSERT' AND NEW.assignee_id IS NOT NULL THEN
    INSERT INTO public.request_assignee_history (
      request_id, 
      assignee_id, 
      status_at_assignment
    ) VALUES (
      NEW.id, 
      NEW.assignee_id, 
      NEW.status
    );
    RETURN NEW;
  END IF;
  
  -- If this is an UPDATE and assignee changed
  IF TG_OP = 'UPDATE' AND OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
    -- Close previous assignee record if exists
    IF OLD.assignee_id IS NOT NULL THEN
      UPDATE public.request_assignee_history 
      SET 
        unassigned_at = now(),
        status_at_unassignment = NEW.status,
        updated_at = now()
      WHERE request_id = NEW.id 
        AND assignee_id = OLD.assignee_id 
        AND unassigned_at IS NULL;
    END IF;
    
    -- Create new assignee record if new assignee exists
    IF NEW.assignee_id IS NOT NULL THEN
      INSERT INTO public.request_assignee_history (
        request_id, 
        assignee_id, 
        status_at_assignment
      ) VALUES (
        NEW.id, 
        NEW.assignee_id, 
        NEW.status
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER track_assignee_changes_trigger
  AFTER INSERT OR UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.track_request_assignee_changes();

-- Add index for better performance
CREATE INDEX idx_request_assignee_history_assignee ON public.request_assignee_history(assignee_id, unassigned_at);
CREATE INDEX idx_request_assignee_history_request ON public.request_assignee_history(request_id);