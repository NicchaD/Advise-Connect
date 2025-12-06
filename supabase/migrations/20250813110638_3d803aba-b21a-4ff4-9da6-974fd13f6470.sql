-- Enable anonymous requests
-- Add support for anonymous submissions by allowing NULL requestor_id in specific cases

-- Update RLS policies to allow anonymous insertions
DROP POLICY IF EXISTS "Users can insert their own requests" ON public.requests;

-- Create new policy to allow both authenticated users and anonymous users to insert requests
CREATE POLICY "Anyone can insert requests" 
ON public.requests 
FOR INSERT 
WITH CHECK (
  -- Allow authenticated users to insert with their own user_id
  (auth.uid() IS NOT NULL AND requestor_id = auth.uid()) OR
  -- Allow anonymous users to insert with NULL requestor_id
  (auth.uid() IS NULL AND requestor_id IS NULL)
);

-- Update the requests table to make requestor_id nullable for anonymous requests
ALTER TABLE public.requests 
ALTER COLUMN requestor_id DROP NOT NULL;