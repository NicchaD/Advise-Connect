-- Add advisory_service_id and service_offering_id columns to sub_activities table
ALTER TABLE public.sub_activities 
ADD COLUMN advisory_service_id UUID REFERENCES public.advisory_services(id),
ADD COLUMN service_offering_id UUID REFERENCES public.service_offerings(id);