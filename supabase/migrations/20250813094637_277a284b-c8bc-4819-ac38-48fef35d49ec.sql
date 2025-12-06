-- Add billability_percentage field to requests table
ALTER TABLE public.requests 
ADD COLUMN billability_percentage numeric;