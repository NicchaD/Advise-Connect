-- Manually sync existing advisory team members that have null user_ids
UPDATE public.advisory_team_members 
SET user_id = p.user_id,
    name = p.username,
    updated_at = now()
FROM public.profiles p
WHERE advisory_team_members.email = p.email 
  AND advisory_team_members.title = p.role
  AND advisory_team_members.user_id IS NULL
  AND p.role IN ('Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head');