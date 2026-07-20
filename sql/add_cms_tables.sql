-- ============================================
-- SQL Migration: VYBE Africa CMS Tables & Policies
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. TEAM MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL,
    image_url TEXT,
    email TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 2. IMPACT STATS TABLE
CREATE TABLE IF NOT EXISTS public.impact_stats (
    key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    value NUMERIC NOT NULL DEFAULT 0,
    target_value NUMERIC NOT NULL DEFAULT 0,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.impact_stats ENABLE ROW LEVEL SECURITY;

-- 3. GALLERY ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.gallery_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    image_url TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

-- 4. PAGE CONTENTS TABLE (Unlimited scope for site content customization)
CREATE TABLE IF NOT EXISTS public.page_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page TEXT NOT NULL,         -- e.g., 'child-protection', 'climate', 'about', 'homepage'
    section TEXT NOT NULL,      -- e.g., 'hero', 'objectives', 'impact'
    content_key TEXT NOT NULL,  -- e.g., 'title', 'body', 'subtext'
    value TEXT NOT NULL,        -- The actual text content (HTML or Plaintext)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_page_section_key UNIQUE (page, section, content_key)
);

-- Enable RLS
ALTER TABLE public.page_contents ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Helper Function to check if active auth.uid() is a staff member
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND user_type = 'staff'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for public read (SELECT)
CREATE POLICY "Public read team_members" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Public read impact_stats" ON public.impact_stats FOR SELECT USING (true);
CREATE POLICY "Public read gallery_items" ON public.gallery_items FOR SELECT USING (true);
CREATE POLICY "Public read page_contents" ON public.page_contents FOR SELECT USING (true);

-- Policies for admin/staff modifications
CREATE POLICY "Staff insert team_members" ON public.team_members FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "Staff update team_members" ON public.team_members FOR UPDATE USING (public.is_staff());
CREATE POLICY "Staff delete team_members" ON public.team_members FOR DELETE USING (public.is_staff());

CREATE POLICY "Staff insert impact_stats" ON public.impact_stats FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "Staff update impact_stats" ON public.impact_stats FOR UPDATE USING (public.is_staff());
CREATE POLICY "Staff delete impact_stats" ON public.impact_stats FOR DELETE USING (public.is_staff());

CREATE POLICY "Staff insert gallery_items" ON public.gallery_items FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "Staff update gallery_items" ON public.gallery_items FOR UPDATE USING (public.is_staff());
CREATE POLICY "Staff delete gallery_items" ON public.gallery_items FOR DELETE USING (public.is_staff());

CREATE POLICY "Staff insert page_contents" ON public.page_contents FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "Staff update page_contents" ON public.page_contents FOR UPDATE USING (public.is_staff());
CREATE POLICY "Staff delete page_contents" ON public.page_contents FOR DELETE USING (public.is_staff());

-- ============================================
-- SEED DATA
-- ============================================

-- Seed Team Members
INSERT INTO public.team_members (name, role, department, image_url, email, is_verified) VALUES
('Sharon Chepkite', 'Executive Director', 'Executive', 'assets/images/IMG-20251211-WA0053.jpg', 'sharon.c@vybeafrica.org', true),
('Moses Kibet', 'Programs Manager', 'Programs', 'assets/images/IMG-20251211-WA0024.jpg', 'moses.k@vybeafrica.org', true),
('Marcellina Cherubia', 'Communications Officer', 'Communications', 'assets/images/team/Marcellina Cherubia.jpg', 'marcellina.c@vybeafrica.org', true),
('Farex Nandwa', 'HR Director', 'Human Resources', 'assets/images/IMG-20251211-WA0030.jpg', 'farex.n@vybeafrica.org', true),
('Tony Barasa', 'M&E Lead', 'Monitoring & Eval', 'assets/images/team/Tony Barasa.jpg', 'tony.b@vybeafrica.org', true),
('Joe Junior', 'Finance Manager', 'Finance', 'assets/images/team/Joe Junior.jpg', 'joe.j@vybeafrica.org', true)
ON CONFLICT DO NOTHING;

-- Seed Impact Stats
INSERT INTO public.impact_stats (key, label, value, target_value, icon) VALUES
('youth_reached', 'Youth Reached', 1200000, 1200000, 'group'),
('active_programs', 'Active Programs', 45, 45, 'event_available'),
('staff_members', 'Staff Members', 320, 320, 'badge'),
('global_partners', 'Global Partners', 85, 85, 'public')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, target_value = EXCLUDED.target_value;

-- Seed Page Contents: Climate Action
INSERT INTO public.page_contents (page, section, content_key, value) VALUES
('climate', 'hero', 'title', 'Climate Action & Environmental Conservation'),
('climate', 'hero', 'subtitle', 'Empowering youth to lead sustainable green solutions in West Pokot'),
('climate', 'overview', 'heading', 'Building Climate Resilience Through Youth-Led Action'),
('climate', 'overview', 'description', 'At VYBE Africa, we believe that young people are key advocates for sustainable land management, reforestation, and ecological preservation. Our programs address deforestation, waste management, and sustainable farming systems.')
ON CONFLICT (page, section, content_key) DO UPDATE SET value = EXCLUDED.value;

-- Seed Page Contents: Child Protection
INSERT INTO public.page_contents (page, section, content_key, value) VALUES
('child-protection', 'hero', 'title', 'Child Protection & Youth Safety Systems'),
('child-protection', 'hero', 'subtitle', 'Securing safe ecosystems, dignity, and rights for children in West Pokot'),
('child-protection', 'overview', 'heading', 'Zero Tolerance for Exploitation and Harm'),
('child-protection', 'overview', 'description', 'Our child protection pillar collaborates with community leaders, schools, and safety networks to prevent child abuse, child marriage, and teenage exploitation, ensuring a safe, supportive space for youth to learn and grow.')
ON CONFLICT (page, section, content_key) DO UPDATE SET value = EXCLUDED.value;
