-- Add policy to allow all authenticated users to view basic profile information for display purposes
CREATE POLICY "authenticated_users_can_view_basic_profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);