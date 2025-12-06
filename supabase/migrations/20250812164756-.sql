-- Add allocation_percentage column to requests table
ALTER TABLE public.requests 
ADD COLUMN allocation_percentage text;