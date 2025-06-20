
-- Create productions table
CREATE TABLE public.productions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_productions junction table for team membership
CREATE TABLE public.user_productions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  production_id UUID REFERENCES public.productions(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, production_id)
);

-- Create location_shares table for real-time location sharing
CREATE TABLE public.location_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  production_id UUID REFERENCES public.productions(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  grid_reference TEXT, -- For maze-like grid system (A:1, B:2, etc.)
  is_sharing BOOLEAN DEFAULT false,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, production_id)
);

-- Create work_entries table for logging completed work
CREATE TABLE public.work_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  production_id UUID REFERENCES public.productions(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  location TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  grid_reference TEXT,
  notes TEXT,
  hours_worked DECIMAL(4, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_ratings table for performance tracking
CREATE TABLE public.user_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  production_id UUID REFERENCES public.productions(id) ON DELETE CASCADE,
  rated_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, production_id, rated_by)
);

-- Create chat_messages table for team communication
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id UUID REFERENCES public.productions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for productions
CREATE POLICY "Users can view productions they belong to" 
  ON public.productions FOR SELECT 
  USING (id IN (SELECT production_id FROM public.user_productions WHERE user_id = auth.uid()));

CREATE POLICY "Production admins can manage productions" 
  ON public.productions FOR ALL 
  USING (created_by = auth.uid() OR id IN (
    SELECT production_id FROM public.user_productions 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- RLS Policies for user_productions
CREATE POLICY "Users can view their own production memberships" 
  ON public.user_productions FOR SELECT 
  USING (user_id = auth.uid() OR production_id IN (
    SELECT production_id FROM public.user_productions WHERE user_id = auth.uid()
  ));

CREATE POLICY "Production admins can manage memberships" 
  ON public.user_productions FOR ALL 
  USING (production_id IN (
    SELECT production_id FROM public.user_productions 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- RLS Policies for location_shares
CREATE POLICY "Users can view location shares in their productions" 
  ON public.location_shares FOR SELECT 
  USING (production_id IN (
    SELECT production_id FROM public.user_productions WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their own location shares" 
  ON public.location_shares FOR ALL 
  USING (user_id = auth.uid());

-- RLS Policies for work_entries
CREATE POLICY "Users can view work entries in their productions" 
  ON public.work_entries FOR SELECT 
  USING (production_id IN (
    SELECT production_id FROM public.user_productions WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their own work entries" 
  ON public.work_entries FOR ALL 
  USING (user_id = auth.uid());

-- RLS Policies for user_ratings
CREATE POLICY "Users can view ratings in their productions" 
  ON public.user_ratings FOR SELECT 
  USING (production_id IN (
    SELECT production_id FROM public.user_productions WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create ratings for their production members" 
  ON public.user_ratings FOR INSERT 
  WITH CHECK (rated_by = auth.uid() AND production_id IN (
    SELECT production_id FROM public.user_productions WHERE user_id = auth.uid()
  ));

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their productions" 
  ON public.chat_messages FOR SELECT 
  USING (production_id IN (
    SELECT production_id FROM public.user_productions WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can send messages in their productions" 
  ON public.chat_messages FOR INSERT 
  WITH CHECK (user_id = auth.uid() AND production_id IN (
    SELECT production_id FROM public.user_productions WHERE user_id = auth.uid()
  ));

-- Enable realtime for location sharing and chat
ALTER TABLE public.location_shares REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.location_shares;
ALTER publication supabase_realtime ADD TABLE public.chat_messages;
