-- Create admin function to update advisory team members
CREATE OR REPLACE FUNCTION public.admin_update_advisory_team_member(
  member_id uuid,
  update_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_role text;
BEGIN
  -- Check if current user is admin
  SELECT role INTO current_user_role 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  IF current_user_role = 'Admin' THEN
    UPDATE advisory_team_members 
    SET 
      name = COALESCE(update_data->>'name', name),
      title = COALESCE(update_data->>'title', title),
      designation = COALESCE(update_data->>'designation', designation),
      email = COALESCE(update_data->>'email', email),
      advisory_services = COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(update_data->'advisory_services')), 
        advisory_services
      ),
      expertise = COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(update_data->'expertise')), 
        expertise
      ),
      user_id = COALESCE((update_data->>'user_id')::uuid, user_id),
      rate_per_hour = COALESCE((update_data->>'rate_per_hour')::numeric, rate_per_hour),
      updated_at = now()
    WHERE id = member_id;
  ELSE
    RAISE EXCEPTION 'Only admins can update team members';
  END IF;
END;
$function$;