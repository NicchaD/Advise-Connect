-- Create table for temporary form data storage for anonymous users
CREATE TABLE public.temporary_form_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  form_type TEXT NOT NULL, -- 'single_service' or 'multi_service'
  form_data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for session_id for quick lookups
CREATE INDEX idx_temporary_form_data_session_id ON public.temporary_form_data(session_id);

-- Create index for expires_at for cleanup
CREATE INDEX idx_temporary_form_data_expires_at ON public.temporary_form_data(expires_at);

-- Enable RLS
ALTER TABLE public.temporary_form_data ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to manage their own session data
CREATE POLICY "Allow anonymous users to manage their session data" 
ON public.temporary_form_data 
FOR ALL 
USING (true);

-- Function to clean up expired form data
CREATE OR REPLACE FUNCTION public.cleanup_expired_form_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.temporary_form_data 
  WHERE expires_at < now();
END;
$$;

-- Create trigger to update updated_at column
CREATE TRIGGER update_temporary_form_data_updated_at
  BEFORE UPDATE ON public.temporary_form_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();