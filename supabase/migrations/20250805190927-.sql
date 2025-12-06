-- Update existing users to have Advisory roles so they can be synced to advisory_team_members

-- Update Akash to Advisory Consultant
UPDATE profiles 
SET role = 'Advisory Consultant' 
WHERE username = 'Akash';

-- Update Gayathri to Advisory Consultant  
UPDATE profiles 
SET role = 'Advisory Consultant' 
WHERE username = 'Gayathri';

-- Since we don't have Vivek, Pramila, Vinith in profiles with Advisory roles,
-- let's clean up the advisory_team_members table and let it be populated by the trigger

-- Clear the advisory_team_members table to let it be repopulated correctly
DELETE FROM advisory_team_members WHERE user_id IS NULL;

-- Now manually trigger the sync for existing advisory users
-- The trigger will automatically populate advisory_team_members when users have advisory roles