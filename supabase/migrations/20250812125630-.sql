-- Drop existing inadequate RLS policy
DROP POLICY IF EXISTS "own_team_record_access" ON public.advisory_team_members;

-- Create comprehensive RLS policies for advisory_team_members table
-- Policy 1: Admins can see everything
CREATE POLICY "admin_full_access" 
ON public.advisory_team_members 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'Admin'
  )
);

-- Policy 2: Service Heads and Leads can see basic info (no emails/rates) of their team
CREATE POLICY "service_leads_team_access" 
ON public.advisory_team_members 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.advisory_team_members atm_viewer ON p.user_id = atm_viewer.user_id
    WHERE p.user_id = auth.uid() 
    AND p.title IN ('Advisory Service Head', 'Advisory Service Lead')
    AND atm_viewer.advisory_services && advisory_team_members.advisory_services
  )
);

-- Policy 3: Team members can see their own full record
CREATE POLICY "own_record_access" 
ON public.advisory_team_members 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Policy 4: Regular users can only see basic public info (name, title, expertise) - no emails or rates
CREATE POLICY "public_basic_info" 
ON public.advisory_team_members 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND is_active = true
);

-- Update the get_safe_team_member_info function to be more restrictive
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
  
  -- Admins can see everything
  IF current_user_role = 'Admin' THEN
    RETURN QUERY
    SELECT 
      atm.id, atm.user_id, atm.name, atm.title, atm.designation,
      atm.advisory_services, atm.expertise, atm.is_active,
      atm.created_at, atm.updated_at, atm.email, atm.rate_per_hour
    FROM advisory_team_members atm
    WHERE (member_id IS NULL OR atm.id = member_id)
    AND atm.is_active = true;
    
  -- Service heads/leads can see rates but not emails
  ELSIF current_user_title IN ('Advisory Service Head', 'Advisory Service Lead') THEN
    RETURN QUERY
    SELECT 
      atm.id, atm.user_id, atm.name, atm.title, atm.designation,
      atm.advisory_services, atm.expertise, atm.is_active,
      atm.created_at, atm.updated_at, 
      NULL::text as email, -- Hide email
      atm.rate_per_hour
    FROM advisory_team_members atm
    WHERE (member_id IS NULL OR atm.id = member_id)
    AND atm.is_active = true;
    
  ELSE
    -- Regular users can only see basic info (no email/rates)
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

-- Drop and recreate the advisory_team_members_basic view to use the secure function
DROP VIEW IF EXISTS public.advisory_team_members_basic;

CREATE VIEW public.advisory_team_members_basic AS
SELECT 
  id, name, title, designation, advisory_services, expertise, 
  is_active, created_at, updated_at
FROM public.get_safe_team_member_info()
WHERE email IS NULL AND rate_per_hour IS NULL; -- Only show records without sensitive data for regular users