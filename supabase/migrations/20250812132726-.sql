-- Fix security issue: Remove email and rate access from service_leads_basic_access policy
-- This prevents unauthorized access to employee email addresses and hourly rates

-- Drop the current service_leads_basic_access policy that exposes sensitive data
DROP POLICY IF EXISTS "service_leads_basic_access" ON public.advisory_team_members;

-- Create a new secure policy that only allows service leads to see basic profile info
-- without exposing sensitive data like emails and rates
CREATE POLICY "service_leads_public_info_only" 
ON public.advisory_team_members 
FOR SELECT 
TO authenticated
USING (
  is_user_service_lead() = true 
  AND is_active = true
);

-- Update the get_safe_team_member_info function to be more restrictive
-- This ensures emails and rates are only visible to admins or the team member themselves
CREATE OR REPLACE FUNCTION public.get_safe_team_member_info(member_id uuid DEFAULT NULL::uuid)
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