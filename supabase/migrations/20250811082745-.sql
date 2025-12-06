-- Add fields to store saved estimation data in requests table
ALTER TABLE public.requests 
ADD COLUMN saved_total_hours integer DEFAULT NULL,
ADD COLUMN saved_total_cost numeric DEFAULT NULL,
ADD COLUMN saved_total_pd_estimate numeric DEFAULT NULL,
ADD COLUMN saved_assignee_rate numeric DEFAULT NULL,
ADD COLUMN estimation_saved_at timestamp with time zone DEFAULT NULL;