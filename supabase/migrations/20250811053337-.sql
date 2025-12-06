-- Add current assignee name and original assignee name columns to requests table
ALTER TABLE public.requests 
ADD COLUMN current_assignee_name TEXT,
ADD COLUMN original_assignee_name TEXT;

-- Create function to update assignee names when assignee changes
CREATE OR REPLACE FUNCTION public.update_assignee_names()
RETURNS TRIGGER AS $$
BEGIN
  -- Update current assignee name when assignee_id changes
  IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
    IF NEW.assignee_id IS NOT NULL THEN
      SELECT username INTO NEW.current_assignee_name
      FROM profiles 
      WHERE user_id = NEW.assignee_id;
    ELSE
      NEW.current_assignee_name := NULL;
    END IF;
  END IF;
  
  -- Update original assignee name when original_assignee_id changes
  IF NEW.original_assignee_id IS DISTINCT FROM OLD.original_assignee_id THEN
    IF NEW.original_assignee_id IS NOT NULL THEN
      SELECT username INTO NEW.original_assignee_name
      FROM profiles 
      WHERE user_id = NEW.original_assignee_id;
    ELSE
      NEW.original_assignee_name := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update assignee names
CREATE TRIGGER update_assignee_names_trigger
  BEFORE UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_assignee_names();

-- Initialize existing records with current assignee names
UPDATE public.requests 
SET current_assignee_name = (
  SELECT username 
  FROM profiles 
  WHERE user_id = requests.assignee_id
)
WHERE assignee_id IS NOT NULL;

-- Initialize existing records with original assignee names
UPDATE public.requests 
SET original_assignee_name = (
  SELECT username 
  FROM profiles 
  WHERE user_id = requests.original_assignee_id
)
WHERE original_assignee_id IS NOT NULL;