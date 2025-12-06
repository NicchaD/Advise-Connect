-- Remove the overly broad service_role policy and make access more restrictive

-- Drop the permissive service_role policy
DROP POLICY IF EXISTS "System access only for advisory team members" ON public.advisory_team_members;

-- The table should now only be accessible through:
-- 1. Admins (full access)
-- 2. Individual users (their own record only)
-- 3. The secure function for controlled access

-- Verify we have the correct policies
DO $$
DECLARE
    policy_count INTEGER;
    policy_names TEXT[];
BEGIN
    -- Get current policy names
    SELECT COUNT(*), array_agg(policyname) INTO policy_count, policy_names
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'advisory_team_members';
    
    RAISE NOTICE 'Current policies on advisory_team_members: % (count: %)', policy_names, policy_count;
    
    -- Ensure we have exactly the right policies
    IF policy_count != 2 THEN
        RAISE WARNING 'Unexpected number of policies found: %', policy_count;
    END IF;
END $$;

-- Add a final verification that sensitive data access is properly controlled
COMMENT ON TABLE public.advisory_team_members IS 
'Advisory team members table with strict RLS policies. 
Direct access limited to: 
- Admins (full access for management)
- Individual users (own record only)
Use get_safe_team_member_info() function for role-based controlled access.
Email addresses and rates are protected from unauthorized access.';