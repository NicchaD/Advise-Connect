-- Add implementation_start_date column to requests table
ALTER TABLE public.requests 
ADD COLUMN implementation_start_date TIMESTAMP WITH TIME ZONE;