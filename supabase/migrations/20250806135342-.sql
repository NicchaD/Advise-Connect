-- Add advisory_service_id column to activities table
ALTER TABLE public.activities 
ADD COLUMN advisory_service_id UUID REFERENCES public.advisory_services(id);

-- Update existing activities to link them to Engineering Excellence advisory service
UPDATE public.activities 
SET advisory_service_id = (
  SELECT id FROM public.advisory_services 
  WHERE name = 'Engineering Excellence' 
  LIMIT 1
)
WHERE advisory_service_id IS NULL;