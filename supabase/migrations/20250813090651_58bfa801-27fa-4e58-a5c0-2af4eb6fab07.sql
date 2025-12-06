-- Add field to store the frozen assignee billability role during estimation
ALTER TABLE public.requests 
ADD COLUMN saved_assignee_role TEXT;