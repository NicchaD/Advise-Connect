-- Update the requests table to handle the new request format properly
-- Ensure the database can store all request details submitted by users

-- First, let's check if we need to add any missing columns or update existing ones
-- The table should already have the necessary columns based on the schema

-- Add a trigger to update the updated_at column
CREATE TRIGGER update_requests_updated_at
BEFORE UPDATE ON public.requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();