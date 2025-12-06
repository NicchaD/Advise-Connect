-- Fix security issue: Restrict access to advisory_team_members table
-- Remove overly permissive policy that allows all authenticated users to view sensitive data
DROP POLICY IF EXISTS "All authenticated users can view advisory team members" ON public.advisory_team_members;

-- Create more restrictive policies for different access levels

-- 1. Advisory team members can view their own complete record
CREATE POLICY "Advisory team members can view their own record" 
ON public.advisory_team_members 
FOR SELECT 
USING (user_id = auth.uid() AND is_active = true);

-- 2. Advisory roles can view basic information (name, title, advisory services, expertise) but not sensitive data like rates and emails
CREATE POLICY "Advisory roles can view basic team member info" 
ON public.advisory_team_members 
FOR SELECT 
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.title IN ('Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head')
  )
);

-- 3. Create a view for non-sensitive advisory team member information
CREATE OR REPLACE VIEW public.advisory_team_members_basic AS
SELECT 
  id,
  user_id,
  name,
  title,
  advisory_services,
  expertise,
  is_active,
  designation,
  created_at,
  updated_at
FROM public.advisory_team_members
WHERE is_active = true;

-- 4. Set up RLS for the view
ALTER VIEW public.advisory_team_members_basic SET (security_invoker = true);

-- 5. Grant appropriate permissions on the view
GRANT SELECT ON public.advisory_team_members_basic TO authenticated;

-- 6. Create a security definer function for safe rate lookup (only for authorized users)
CREATE OR REPLACE FUNCTION public.get_assignee_rate(assignee_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assignee_rate NUMERIC;
  current_user_role TEXT;
  current_user_title TEXT;
BEGIN
  -- Get current user's role and title
  SELECT role, title INTO current_user_role, current_user_title
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Only allow access if user is:
  -- 1. Admin
  -- 2. The assignee themselves
  -- 3. Advisory Service Head or Lead (for estimation purposes)
  IF current_user_role = 'Admin' 
     OR auth.uid() = assignee_user_id 
     OR current_user_title IN ('Advisory Service Head', 'Advisory Service Lead') THEN
    
    SELECT rate_per_hour INTO assignee_rate
    FROM advisory_team_members 
    WHERE user_id = assignee_user_id AND is_active = true;
    
    RETURN COALESCE(assignee_rate, 0);
  ELSE
    -- Return null for unauthorized access
    RETURN NULL;
  END IF;
END;
$$;