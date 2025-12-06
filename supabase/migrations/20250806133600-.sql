-- Add associated_tool column to sub_activities table
ALTER TABLE public.sub_activities 
ADD COLUMN associated_tool TEXT;