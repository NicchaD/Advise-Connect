-- Security fix for advisory team member views
-- Apply proper RLS policies to prevent unauthorized access to employee data

-- Enable RLS on the views
ALTER VIEW public.advisory_team_members_basic ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.advisory_team_members_public ENABLE ROW LEVEL SECURITY;

-- Create secure policies for advisory_team_members_basic view
-- Only admins and the team member themselves can access basic info
CREATE POLICY "admin_and_self_access_basic" 
ON public.advisory_team_members_basic 
FOR SELECT
TO authenticated
USING (
  -- Admin access
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'Admin'
  )
  OR
  -- Self access - find matching user_id in main table
  EXISTS (
    SELECT 1 FROM public.advisory_team_members atm
    WHERE atm.id = advisory_team_members_basic.id 
    AND atm.user_id = auth.uid()
  )
);

-- Create secure policies for advisory_team_members_public view  
-- Only allow authenticated users to see basic public info
CREATE POLICY "authenticated_public_access" 
ON public.advisory_team_members_public 
FOR SELECT
TO authenticated
USING (is_active = true);

-- Revoke all public access from both views
REVOKE ALL ON public.advisory_team_members_basic FROM PUBLIC;
REVOKE ALL ON public.advisory_team_members_public FROM PUBLIC;

-- Grant select only to authenticated users (RLS will control actual access)
GRANT SELECT ON public.advisory_team_members_basic TO authenticated;
GRANT SELECT ON public.advisory_team_members_public TO authenticated;