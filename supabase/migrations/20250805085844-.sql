-- Add assigned_consultant_name column to requests table
ALTER TABLE public.requests 
ADD COLUMN assigned_consultant_name TEXT;