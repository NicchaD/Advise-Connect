-- Modify requests table to support service offering specific activities
-- Add a new column to store activities grouped by service offering
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS service_offering_activities JSONB DEFAULT '{}'::jsonb;

-- Add a comment to describe the new column structure
COMMENT ON COLUMN public.requests.service_offering_activities IS 'Stores activities and sub-activities grouped by service offering ID. Structure: {[serviceOfferingId]: {activities: {...}, subActivities: {...}}}';

-- Create an index for better performance on the new column
CREATE INDEX IF NOT EXISTS idx_requests_service_offering_activities 
ON public.requests USING GIN (service_offering_activities);