-- Create table for request feedback
CREATE TABLE public.request_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL,
  user_id UUID NOT NULL,
  quality_rating INTEGER NOT NULL CHECK (quality_rating >= 1 AND quality_rating <= 5),
  response_time_rating INTEGER NOT NULL CHECK (response_time_rating >= 1 AND response_time_rating <= 5),
  satisfaction_rating INTEGER NOT NULL CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  communication_rating INTEGER NOT NULL CHECK (communication_rating >= 1 AND communication_rating <= 5),
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  feedback_text TEXT,
  benefits_achieved TEXT,
  suggestions_for_improvement TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.request_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for feedback access
CREATE POLICY "Users can view their own feedback" 
ON public.request_feedback 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create feedback for their requests" 
ON public.request_feedback 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM public.requests 
    WHERE requests.id = request_feedback.request_id 
    AND requests.requestor_id = auth.uid()
  )
);

CREATE POLICY "Admins and consultants can view all feedback" 
ON public.request_feedback 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND (
      profiles.role = 'Admin' OR 
      profiles.title IN ('Advisory Consultant', 'Advisory Service Lead', 'Advisory Service Head')
    )
  )
);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_request_feedback_updated_at
BEFORE UPDATE ON public.request_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key constraints
ALTER TABLE public.request_feedback 
ADD CONSTRAINT fk_request_feedback_request_id 
FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;

-- Add unique constraint to prevent multiple feedback per user per request
ALTER TABLE public.request_feedback 
ADD CONSTRAINT unique_user_request_feedback 
UNIQUE (request_id, user_id);