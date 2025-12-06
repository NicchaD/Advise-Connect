-- Make the first user an admin (assuming they are the only user currently)
UPDATE public.profiles 
SET role = 'Admin' 
WHERE user_id IN (
  SELECT user_id 
  FROM public.profiles 
  ORDER BY created_at ASC 
  LIMIT 1
);