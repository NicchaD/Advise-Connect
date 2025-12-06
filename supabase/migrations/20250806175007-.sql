-- Add designation column to advisory_team_members table
ALTER TABLE public.advisory_team_members 
ADD COLUMN designation TEXT;