-- Fix infinite recursion in profiles table by removing problematic policy and using proper security definer function

-- Drop the problematic admin policy that causes infinite recursion
DROP POLICY IF EXISTS "admins_can_view_all_profiles" ON public.profiles;

-- Recreate the admin policy using the security definer function without self-reference
CREATE POLICY "admins_can_view_all_profiles" ON public.profiles
FOR SELECT 
USING (get_current_user_role() = 'Admin');

-- Clean up duplicate policies
DROP POLICY IF EXISTS "own_profile_insert" ON public.profiles;
DROP POLICY IF EXISTS "user_own_profile_insert" ON public.profiles;
DROP POLICY IF EXISTS "user_own_profile_read" ON public.profiles;

-- Ensure we have clean, working policies
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_view_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "own_profile_select" ON public.profiles;

-- Create clean policies
CREATE POLICY "users_can_view_own_profile" ON public.profiles
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_profile" ON public.profiles
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_profile" ON public.profiles
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);