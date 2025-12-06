-- Add rate_per_hour column to advisory_team_members table
ALTER TABLE public.advisory_team_members 
ADD COLUMN rate_per_hour DECIMAL(10,2);