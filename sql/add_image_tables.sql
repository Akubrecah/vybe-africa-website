-- ============================================
-- IMAGE CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.image_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.image_categories ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read image_categories" ON public.image_categories FOR SELECT USING (true);

-- Staff can manage categories
CREATE POLICY "Staff insert image_categories" ON public.image_categories FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "Staff update image_categories" ON public.image_categories FOR UPDATE USING (public.is_staff());
CREATE POLICY "Staff delete image_categories" ON public.image_categories FOR DELETE USING (public.is_staff());

-- ============================================
-- IMAGES TABLE (metadata in database, files in Supabase Storage)
-- ============================================
CREATE TABLE IF NOT EXISTS public.images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    description TEXT,
    image_url TEXT NOT NULL,                    -- Public URL from Supabase Storage
    storage_path TEXT NOT NULL UNIQUE,          -- Path in storage bucket (e.g., "gallery/image-name.jpg")
    bucket_name TEXT NOT NULL DEFAULT 'vybe-images',
    category_id UUID REFERENCES public.image_categories(id) ON DELETE SET NULL,
    alt_text TEXT,
    tags TEXT[],
    file_size BIGINT,
    mime_type TEXT,
    width INTEGER,
    height INTEGER,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- Public read for active images
CREATE POLICY "Public read active images" ON public.images FOR SELECT USING (is_active = true);

-- Staff can manage all images
CREATE POLICY "Staff insert images" ON public.images FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "Staff update images" ON public.images FOR UPDATE USING (public.is_staff());
CREATE POLICY "Staff delete images" ON public.images FOR DELETE USING (public.is_staff());

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_images_category_id ON public.images(category_id);
CREATE INDEX IF NOT EXISTS idx_images_is_active ON public.images(is_active);
CREATE INDEX IF NOT EXISTS idx_images_is_featured ON public.images(is_featured);
CREATE INDEX IF NOT EXISTS idx_images_created_at ON public.images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_images_storage_path ON public.images(storage_path);
CREATE INDEX IF NOT EXISTS idx_image_categories_slug ON public.image_categories(slug);
CREATE INDEX IF NOT EXISTS idx_image_categories_is_active ON public.image_categories(is_active);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to images table
DROP TRIGGER IF EXISTS update_images_updated_at ON public.images;
CREATE TRIGGER update_images_updated_at
    BEFORE UPDATE ON public.images
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Apply trigger to image_categories table
DROP TRIGGER IF EXISTS update_image_categories_updated_at ON public.image_categories;
CREATE TRIGGER update_image_categories_updated_at
    BEFORE UPDATE ON public.image_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SEED DEFAULT CATEGORIES
-- ============================================
INSERT INTO public.image_categories (name, slug, description, display_order) VALUES
('Community Outreach', 'outreach', 'Community engagement and outreach programs', 1),
('Youth Workshops', 'workshops', 'Training, workshops and capacity building for youth', 2),
('Climate Action', 'climate', 'Environmental conservation and climate resilience', 3),
('Health Clinics', 'health', 'Mobile health clinics and medical outreach', 4),
('Events', 'events', 'Conferences, launches, and special events', 5),
('Team & Staff', 'team', 'Staff portraits and team activities', 6),
('General', 'general', 'General purpose and miscellaneous images', 99)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order;

-- ============================================
-- STORAGE BUCKET SETUP (Run in Supabase Dashboard SQL Editor)
-- ============================================
-- Create the storage bucket (run this in Supabase Dashboard > SQL Editor):
/*
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'vybe-images',
    'vybe-images',
    true,
    52428800,  -- 50MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
*/

-- Storage policies for public read, staff write:
/*
CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'vybe-images');
CREATE POLICY "Staff can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vybe-images' AND auth.role() = 'authenticated');
CREATE POLICY "Staff can update" ON storage.objects FOR UPDATE USING (bucket_id = 'vybe-images' AND auth.role() = 'authenticated');
CREATE POLICY "Staff can delete" ON storage.objects FOR DELETE USING (bucket_id = 'vybe-images' AND auth.role() = 'authenticated');
*/