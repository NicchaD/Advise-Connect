-- Drop the problematic policy that exposes sensitive data
DROP POLICY IF EXISTS "own_basic_record_only" ON advisory_team_members;

-- Create a new policy for team members to view only non-sensitive data about themselves
CREATE POLICY "own_basic_info_only" 
ON advisory_team_members 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid()
);

-- Update the get_safe_team_member_info function to be more secure
CREATE OR REPLACE FUNCTION public.get_safe_team_member_info(member_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(id uuid, user_id uuid, name text, title text, designation text, advisory_services text[], expertise text[], is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, email text, rate_per_hour numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    -- Everyone else can only see basic info
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

-- Update the admin function to only allow admins to access sensitive data
CREATE OR REPLACE FUNCTION public.admin_get_advisory_team_members()
RETURNS TABLE(id uuid, user_id uuid, name text, title text, designation text, email text, advisory_services text[], expertise text[], rate_per_hour numeric, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Check if current user is admin
  SELECT p.role INTO current_user_role 
  FROM public.profiles p 
  WHERE p.user_id = auth.uid();
  
  IF current_user_role = 'Admin' THEN
    RETURN QUERY
    SELECT 
      atm.id,
      atm.user_id,
      atm.name,
      atm.title,
      atm.designation,
      atm.email,
      atm.advisory_services,
      atm.expertise,
      atm.rate_per_hour,
      atm.is_active,
      atm.created_at,
      atm.updated_at
    FROM public.advisory_team_members atm;
  ELSE
    -- Return empty result if not admin
    RETURN;
  END IF;
END;
$$;

-- Create a secure function for basic public team member info (no emails or rates)
CREATE OR REPLACE FUNCTION public.get_public_team_members()
RETURNS TABLE(id uuid, name text, title text, designation text, advisory_services text[], expertise text[], is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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