-- Add profile picture and admin email support
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_picture_url text,
ADD COLUMN IF NOT EXISTS bio text;

-- Add system settings for admin contact email
INSERT INTO public.system_settings (setting_key, setting_value, description) 
VALUES (
  'admin_contact_email',
  'admin@company.com',
  'Email address for users to contact admin support'
) ON CONFLICT (setting_key) DO NOTHING;

-- Create profiles storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for profile pictures
CREATE POLICY "Users can view all profile pictures" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'profiles');

CREATE POLICY "Users can upload their own profile picture" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile picture" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile picture" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);