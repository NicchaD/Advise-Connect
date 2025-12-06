-- Create trigger to automatically sync advisory team members when profiles are updated
CREATE TRIGGER sync_advisory_team_trigger
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_advisory_team_members();