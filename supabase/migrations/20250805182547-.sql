-- Create a trigger to store the original assignee when a request is first assigned
CREATE OR REPLACE FUNCTION public.set_original_assignee()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is an INSERT and assignee_id is set, store it as original assignee
  IF TG_OP = 'INSERT' AND NEW.assignee_id IS NOT NULL THEN
    NEW.original_assignee_id := NEW.assignee_id;
  END IF;
  
  -- If this is an UPDATE and original_assignee_id is null but assignee_id is being set
  IF TG_OP = 'UPDATE' AND OLD.original_assignee_id IS NULL AND NEW.assignee_id IS NOT NULL THEN
    NEW.original_assignee_id := NEW.assignee_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT operations
CREATE TRIGGER set_original_assignee_on_insert
  BEFORE INSERT ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_original_assignee();

-- Create trigger for UPDATE operations  
CREATE TRIGGER set_original_assignee_on_update
  BEFORE UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_original_assignee();