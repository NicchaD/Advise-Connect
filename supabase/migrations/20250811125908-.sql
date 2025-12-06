-- Add timesheet_data column to requests table to store completed activities
ALTER TABLE public.requests 
ADD COLUMN timesheet_data jsonb DEFAULT '{}'::jsonb;

-- Update the updated_at trigger to include timesheet_data changes
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;