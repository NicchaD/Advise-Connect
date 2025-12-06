-- Update RLS policies to check for titles instead of roles for advisory functions

-- Update request history policies
DROP POLICY IF EXISTS "Admins and consultants can view all history" ON request_history;
CREATE POLICY "Admins and consultants can view all history" ON request_history
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND (
      profiles.role = 'Admin' 
      OR profiles.title IN ('Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head')
    )
  )
);

-- Update request comment policies
DROP POLICY IF EXISTS "Admins and consultants can view all comments" ON request_comments;
CREATE POLICY "Admins and consultants can view all comments" ON request_comments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND (
      profiles.role = 'Admin' 
      OR profiles.title IN ('Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head')
    )
  )
);

DROP POLICY IF EXISTS "Users can insert comments on accessible requests" ON request_comments;
CREATE POLICY "Users can insert comments on accessible requests" ON request_comments
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM requests
    WHERE requests.id = request_comments.request_id 
    AND (
      requests.requestor_id = auth.uid() 
      OR requests.assignee_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid() 
        AND (
          profiles.role = 'Admin' 
          OR profiles.title IN ('Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head')
        )
      )
    )
  )
);

-- Update requests policies
DROP POLICY IF EXISTS "Admins and consultants can view all requests" ON requests;
CREATE POLICY "Admins and consultants can view all requests" ON requests
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND (
      profiles.role = 'Admin' 
      OR profiles.title IN ('Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head')
    )
  )
);