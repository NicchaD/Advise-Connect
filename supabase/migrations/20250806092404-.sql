-- Add activities field to requests table to store selected activities and sub-activities
ALTER TABLE public.requests 
ADD COLUMN selected_activities jsonb DEFAULT '{}'::jsonb;