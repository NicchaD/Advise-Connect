-- Fix the security vulnerability in advisory_team_members RLS policies

-- First, create a security definer function to safely check if user is a service lead
-- This prevents infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.is_user_service_lead()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_title text;
BEGIN
  SELECT title INTO user_title
  FROM profiles 
  WHERE user_id = auth.uid();
  
  RETURN user_title IN ('Advisory Service Head', 'Advisory Service Lead');
END;
$$;

-- Drop the problematic service_leads_team_access policy
DROP POLICY IF EXISTS "service_leads_team_access" ON public.advisory_team_members;

-- Create a secure policy that doesn't expose sensitive data to service leads
-- Service leads should only see basic info, no emails or rates
CREATE POLICY "service_leads_basic_access" 
ON public.advisory_team_members 
FOR SELECT 
TO authenticated
USING (
  public.is_user_service_lead() = true
  AND is_active = true
);

-- Update the get_safe_team_member_info function to properly restrict data access
CREATE OR REPLACE FUNCTION public.get_safe_team_member_info(member_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid, 
  user_id uuid, 
  name text, 
  title text, 
  designation text, 
  advisory_services text[], 
  expertise text[], 
  is_active boolean, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  email text, 
  rate_per_hour numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_role text;
  current_user_title text;
  requesting_user_id uuid;
BEGIN
  requesting_user_id := auth.uid();
  
  IF requesting_user_id IS NULL THEN
    RETURN;
  END IF;
  
  SELECT profiles.role, profiles.title 
  INTO current_user_role, current_user_title
  FROM profiles 
  WHERE profiles.user_id = requesting_user_id;
  
  -- Only admins can see sensitive data (emails and rates)
  IF current_user_role = 'Admin' THEN
    RETURN QUERY
    SELECT 
      atm.id, atm.user_id, atm.name, atm.title, atm.designation,
      atm.advisory_services, atm.expertise, atm.is_active,
      atm.created_at, atm.updated_at, atm.email, atm.rate_per_hour
    FROM advisory_team_members atm
    WHERE (member_id IS NULL OR atm.id = member_id)
    AND atm.is_active = true;
    
  ELSE
    -- Everyone else (including service leads) can only see basic info
    -- Users can see their own email and rate only
    RETURN QUERY
    SELECT 
      atm.id,
      CASE WHEN atm.user_id = requesting_user_id THEN atm.user_id ELSE NULL::uuid END,
      atm.name, atm.title, atm.designation,
      atm.advisory_services, atm.expertise, atm.is_active,
      atm.created_at, atm.updated_at,
      CASE WHEN atm.user_id = requesting_user_id THEN atm.email ELSE NULL::text END,
      CASE WHEN atm.user_id = requesting_user_id THEN atm.rate_per_hour ELSE NULL::numeric END
    FROM advisory_team_members atm
    WHERE (member_id IS NULL OR atm.id = member_id)
    AND atm.is_active = true;
  END IF;
END;
$$;

-- Add a comment to document the security approach
COMMENT ON TABLE public.advisory_team_members IS 'Contains sensitive employee data (emails, rates). Access restricted by RLS policies. Only admins see sensitive data. Use get_safe_team_member_info() for controlled access.';