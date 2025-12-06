-- Create a more granular approach to protect sensitive data
-- while maintaining functionality

-- Step 1: Create a function that safely exposes only the minimal necessary data
-- for different user roles without exposing sensitive information

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
  created_at timestamptz,
  updated_at timestamptz,
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
  -- Get current user info
  requesting_user_id := auth.uid();
  
  IF requesting_user_id IS NULL THEN
    -- Not authenticated, return no data
    RETURN;
  END IF;
  
  SELECT profiles.role, profiles.title 
  INTO current_user_role, current_user_title
  FROM profiles 
  WHERE profiles.user_id = requesting_user_id;
  
  -- Return data based on access level and what's being requested
  IF current_user_role = 'Admin' THEN
    -- Admins can see everything
    RETURN QUERY
    SELECT 
      atm.id,
      atm.user_id,
      atm.name,
      atm.title,
      atm.designation,
      atm.advisory_services,
      atm.expertise,
      atm.is_active,
      atm.created_at,
      atm.updated_at,
      atm.email,
      atm.rate_per_hour
    FROM advisory_team_members atm
    WHERE (member_id IS NULL OR atm.id = member_id)
    AND atm.is_active = true;
    
  ELSIF current_user_title IN ('Advisory Service Head', 'Advisory Service Lead') THEN
    -- Service leads can see rates for budgeting but not emails
    RETURN QUERY
    SELECT 
      atm.id,
      atm.user_id,
      atm.name,
      atm.title,
      atm.designation,
      atm.advisory_services,
      atm.expertise,
      atm.is_active,
      atm.created_at,
      atm.updated_at,
      NULL::text as email, -- Hide email
      atm.rate_per_hour
    FROM advisory_team_members atm
    WHERE (member_id IS NULL OR atm.id = member_id)
    AND atm.is_active = true;
    
  ELSE
    -- Regular users and consultants can only see their own full record
    -- or basic info (no email/rates) for others
    RETURN QUERY
    SELECT 
      atm.id,
      CASE 
        WHEN atm.user_id = requesting_user_id THEN atm.user_id 
        ELSE NULL::uuid 
      END as user_id,
      atm.name,
      atm.title,
      atm.designation,
      atm.advisory_services,
      atm.expertise,
      atm.is_active,
      atm.created_at,
      atm.updated_at,
      CASE 
        WHEN atm.user_id = requesting_user_id THEN atm.email 
        ELSE NULL::text 
      END as email,
      CASE 
        WHEN atm.user_id = requesting_user_id THEN atm.rate_per_hour 
        ELSE NULL::numeric 
      END as rate_per_hour
    FROM advisory_team_members atm
    WHERE (member_id IS NULL OR atm.id = member_id)
    AND atm.is_active = true;
  END IF;
END;
$$;

-- Step 2: Update the existing RLS policies to be even more restrictive
-- Only allow access through the secure function above

-- Drop existing policies and create stricter ones
DROP POLICY IF EXISTS "Advisory team members can view their own record" ON public.advisory_team_members;

-- Create a policy that only allows service_role (system) access
-- All user access should go through the secure function
CREATE POLICY "System access only for advisory team members" 
ON public.advisory_team_members 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Create a very restrictive policy for authenticated users
-- They can only see their own record and only basic fields through RLS
CREATE POLICY "Users can view their own minimal record" 
ON public.advisory_team_members 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() 
  AND is_active = true
);

-- Admin policy remains as is but let's make it more explicit
DROP POLICY IF EXISTS "Admins can manage advisory team members" ON public.advisory_team_members;
CREATE POLICY "Admins can manage advisory team members" 
ON public.advisory_team_members 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'Admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'Admin'
  )
);

-- Grant execute permission on the safe function
GRANT EXECUTE ON FUNCTION public.get_safe_team_member_info TO authenticated;

-- Add a comment explaining the security model
COMMENT ON FUNCTION public.get_safe_team_member_info IS 
'Secure function to access advisory team member data with appropriate access controls. 
Admins see all data, Service heads see rates but no emails, regular users see only basic info except for their own record.';

COMMENT ON TABLE public.advisory_team_members IS 
'Advisory team members table with strict RLS. Direct access is limited. Use get_safe_team_member_info() function for controlled access.';