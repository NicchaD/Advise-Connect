-- Create announcements table for both broadcast and webinar types
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('Broadcast', 'Webinar')),
  title TEXT NOT NULL,
  description TEXT,
  invitation TEXT, -- for webinar type
  date DATE, -- for webinar type
  time TIME, -- for webinar type
  meeting_invite_link TEXT, -- for webinar type
  guest_speaker TEXT, -- for webinar type
  advisory_services TEXT[], -- array of advisory service ids for broadcast
  advisory_speakers TEXT[], -- array of advisory team member ids for webinar
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create knowledge_articles table
CREATE TABLE public.knowledge_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  advisory_service_id UUID,
  tags TEXT[],
  file_url TEXT,
  file_name TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create calendar_events table
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_title TEXT NOT NULL,
  event_date DATE NOT NULL,
  announcement_id UUID, -- link to webinar announcements
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comments table for user comments on entries
CREATE TABLE public.info_hub_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN ('announcement', 'knowledge_article', 'calendar_event')),
  content_id UUID NOT NULL,
  comment TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feedback table for thumbs up/down
CREATE TABLE public.info_hub_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN ('announcement', 'knowledge_article', 'calendar_event')),
  content_id UUID NOT NULL,
  user_id UUID NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(content_type, content_id, user_id) -- prevent duplicate feedback from same user
);

-- Enable RLS on all tables
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.info_hub_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.info_hub_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcements
CREATE POLICY "Everyone can view announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'Admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'Admin'));

-- RLS Policies for knowledge_articles
CREATE POLICY "Everyone can view knowledge articles" ON public.knowledge_articles FOR SELECT USING (true);
CREATE POLICY "Admins can manage knowledge articles" ON public.knowledge_articles FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'Admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'Admin'));

-- RLS Policies for calendar_events
CREATE POLICY "Everyone can view calendar events" ON public.calendar_events FOR SELECT USING (true);
CREATE POLICY "Admins can manage calendar events" ON public.calendar_events FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'Admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'Admin'));

-- RLS Policies for info_hub_comments
CREATE POLICY "Everyone can view comments" ON public.info_hub_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can add comments" ON public.info_hub_comments FOR INSERT 
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON public.info_hub_comments FOR UPDATE 
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON public.info_hub_comments FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for info_hub_feedback
CREATE POLICY "Everyone can view feedback" ON public.info_hub_feedback FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage their feedback" ON public.info_hub_feedback FOR ALL 
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_articles_updated_at
  BEFORE UPDATE ON public.knowledge_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('info-hub-files', 'info-hub-files', true);

-- Create storage policies
CREATE POLICY "Public can view files" ON storage.objects FOR SELECT USING (bucket_id = 'info-hub-files');
CREATE POLICY "Admins can upload files" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'info-hub-files' AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'Admin'));
CREATE POLICY "Admins can update files" ON storage.objects FOR UPDATE 
USING (bucket_id = 'info-hub-files' AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'Admin'));
CREATE POLICY "Admins can delete files" ON storage.objects FOR DELETE 
USING (bucket_id = 'info-hub-files' AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'Admin'));