-- Migration to Supabase Authentication System
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. CREATE USER_PROFILES TABLE
-- ============================================
-- This links to Supabase's auth.users table

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_type TEXT NOT NULL CHECK (user_type IN ('staff', 'member')),
    
    -- Common fields
    name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    bio TEXT,
    
    -- Staff-specific fields
    designation TEXT,
    role TEXT, -- 'superadmin', 'hr', 'programs', 'staff'
    
    -- Member-specific fields
    county TEXT,
    organization TEXT,
    member_type TEXT CHECK (member_type IN ('individual', 'organization', 'youth')),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. CREATE RLS POLICIES
-- ============================================

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON user_profiles
FOR SELECT
USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON user_profiles
FOR UPDATE
USING (auth.uid() = id);

-- Policy: Users can insert their own profile (for registration)
CREATE POLICY "Users can insert own profile"
ON user_profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Policy: Staff can view all staff profiles
CREATE POLICY "Staff can view all staff"
ON user_profiles
FOR SELECT
USING (
    user_type = 'staff' AND
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND user_type = 'staff'
    )
);

-- Policy: Superadmins can view all profiles
CREATE POLICY "Superadmins view all"
ON user_profiles
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'superadmin'
    )
);

-- ============================================
-- 4. CREATE FUNCTION TO AUTO-UPDATE updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS user_profiles_user_type_idx ON user_profiles(user_type);
CREATE INDEX IF NOT EXISTS user_profiles_role_idx ON user_profiles(role);

-- ============================================
-- 6. UPDATE EXISTING TABLES (BACKUP)
-- ============================================

-- Rename existing tables to keep as backup
ALTER TABLE IF EXISTS users RENAME TO users_backup_old;
ALTER TABLE IF EXISTS members RENAME TO members_backup_old;

-- ============================================
-- SETUP COMPLETE
-- ============================================

-- Next steps:
-- 1. Enable Email Auth in Supabase Dashboard > Authentication > Providers
-- 2. Configure email templates in Authentication > Email Templates
-- 3. Set Site URL in Authentication > URL Configuration to your Vercel domain
-- 4. Configure redirect URLs for email confirmation
