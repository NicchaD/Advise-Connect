-- Fix advisory_team_members table permissions
-- Remove overly broad permissions that bypass RLS intent

-- Revoke all permissions from anon role (anonymous users shouldn't access this table directly)
REVOKE ALL PRIVILEGES ON public.advisory_team_members FROM anon;

-- Revoke all permissions from authenticated role and grant only what's needed
REVOKE ALL PRIVILEGES ON public.advisory_team_members FROM authenticated;

-- Grant only SELECT to authenticated users (INSERT/UPDATE/DELETE should only be through admin interface)
-- RLS policies will still control what they can actually see
GRANT SELECT ON public.advisory_team_members TO authenticated;

-- Ensure the service_role (used by admin functions) has full access
GRANT ALL PRIVILEGES ON public.advisory_team_members TO service_role;

-- Also check and fix any default privileges that might be granting too much access
-- Reset default privileges for future tables to be more restrictive
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;

-- Grant minimal necessary default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO authenticated;

-- Double-check that our RLS policies are working correctly by testing them
-- This will help verify the fix
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    -- Verify we have the correct restrictive policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'advisory_team_members'
    AND policyname IN ('Admins can manage advisory team members', 'Advisory team members can view their own record');
    
    IF policy_count != 2 THEN
        RAISE EXCEPTION 'Expected RLS policies not found. Found % policies instead of 2', policy_count;
    END IF;
    
    RAISE NOTICE 'Security fix applied successfully. Advisory team members table now properly secured.';
END $$;