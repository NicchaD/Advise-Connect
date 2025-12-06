-- Add RLS policy to allow consultants to see basic profile info for requestors of their assigned requests
-- This fixes the "Unknown User" issue in My Items module

CREATE POLICY "consultants_view_requestor_profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  -- Admins can see all profiles
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile 
    WHERE admin_profile.user_id = auth.uid() 
    AND admin_profile.role = 'Admin'
  )
  OR
  -- Advisory consultants can see profiles of users whose requests they're assigned to
  EXISTS (
    SELECT 1 FROM public.profiles consultant_profile 
    WHERE consultant_profile.user_id = auth.uid() 
    AND consultant_profile.title IN ('Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head')
    AND EXISTS (
      SELECT 1 FROM public.requests 
      WHERE requests.requestor_id = profiles.user_id 
      AND (requests.assignee_id = auth.uid() OR requests.original_assignee_id = auth.uid())
    )
  )
);