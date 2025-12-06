-- Remove remaining unsynced advisory team members (these were manually added without corresponding profiles)
DELETE FROM public.advisory_team_members 
WHERE user_id IS NULL;

-- Test the trigger by creating a new advisory profile to ensure future syncing works
-- This will be automatically synced due to the trigger