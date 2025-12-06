-- Complete security fix for advisory_team_members table
-- Remove all public access and implement strict role-based access control

-- First, drop all existing policies to start fresh
DROP POLICY IF EXISTS "service_leads_public_info_only" ON public.advisory_team_members;
DROP POLICY IF EXISTS "admin_full_access" ON public.advisory_team_members;
DROP POLICY IF EXISTS "own_record_access" ON public.advisory_team_members;

-- Create secure policies with no public access

-- 1. Admins have full access to all data
CREATE POLICY "admin_full_access" 
ON public.advisory_team_members 
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'Admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'Admin'
  )
);

-- 2. Team members can only view their own record (basic info only)
CREATE POLICY "own_record_access" 
ON public.advisory_team_members 
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 3. Service leads can only see basic info (no emails/rates) of active members
-- But only through the secure function, not direct table access
-- This policy intentionally has no direct table access for service leads

-- Create a public function that returns only safe, non-sensitive data
CREATE OR REPLACE FUNCTION public.get_public_team_members()
RETURNS TABLE(
  id uuid,
  name text,
  title text,
  designation text,
  advisory_services text[],
  expertise text[],
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only return basic info that's safe for public consumption
  -- No emails, rates, user_ids, or other sensitive data
  RETURN QUERY
  SELECT 
    atm.id,
    atm.name,
    atm.title,
    atm.designation,
    atm.advisory_services,
    atm.expertise,
    atm.is_active
  FROM advisory_team_members atm
  WHERE atm.is_active = true;
END;
$$;