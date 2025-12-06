-- Add UPDATE policy for request_feedback table to allow users to update their own feedback
CREATE POLICY "Users can update their own feedback" 
ON public.request_feedback 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);