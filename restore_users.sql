-- RESTORE USERS FROM BACKUP & CREATE NEW STAFF
-- Run this in Supabase SQL Editor

-- ============================================
-- OPTION 1: Restore from backup (if exists)
-- ============================================

-- Check if backup exists and restore it
DO $$
BEGIN
    -- Check if backup table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users_backup_old') THEN
        -- Drop current users table if exists
        DROP TABLE IF EXISTS users CASCADE;
        
        -- Rename backup to users
        ALTER TABLE users_backup_old RENAME TO users;
        
        RAISE NOTICE '✅ Restored users from backup!';
    ELSE
        RAISE NOTICE '⚠️ No backup found. Creating new users table...';
        
        -- Create users table if doesn't exist
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            phone TEXT,
            role TEXT DEFAULT 'staff',
            designation TEXT,
            bio TEXT,
            avatar_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- ============================================
-- OPTION 2: Create sample staff users
-- ============================================

-- Clear existing users if starting fresh (COMMENTED OUT FOR SAFETY)
-- DELETE FROM users;

-- Insert staff users with bcrypt-hashed passwords
-- Password for all: "Password123" (hashed with bcrypt)
-- You can change these to your actual staff members

INSERT INTO users (id, name, email, password, role, designation, phone, created_at) VALUES
(
    gen_random_uuid(),
    'Akubrecah Entertainment',
    'poweldayck@gmail.com',
    '$2a$10$rQnM6OxLC.gOJL.VPGGxQOYJHKGVlDQxlXG6/bVXLqUUKI9lWOqKS', -- Password123
    'superadmin',
    'Executive Director',
    '+254 717 648 457',
    NOW()
),
(
    gen_random_uuid(),
    'HR Manager',
    'hr@vybeafrica.org',
    '$2a$10$rQnM6OxLC.gOJL.VPGGxQOYJHKGVlDQxlXG6/bVXLqUUKI9lWOqKS', -- Password123
    'hr',
    'HR Manager',
    '+254 700 000 001',
    NOW()
),
(
    gen_random_uuid(),
    'Programs Coordinator',
    'programs@vybeafrica.org',
    '$2a$10$rQnM6OxLC.gOJL.VPGGxQOYJHKGVlDQxlXG6/bVXLqUUKI9lWOqKS', -- Password123
    'programs',
    'Programs Manager',
    '+254 700 000 002',
    NOW()
),
(
    gen_random_uuid(),
    'Field Officer',
    'field@vybeafrica.org',
    '$2a$10$rQnM6OxLC.gOJL.VPGGxQOYJHKGVlDQxlXG6/bVXLqUUKI9lWOqKS', -- Password123
    'staff',
    'Field Officer',
    '+254 700 000 003',
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    designation = EXCLUDED.designation,
    updated_at = NOW();

-- ============================================
-- OPTION 3: Create members table too
-- ============================================

CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    county TEXT,
    organization TEXT,
    member_type TEXT DEFAULT 'individual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ENABLE RLS (Row Level Security)
-- ============================================

-- Disable RLS for now to allow reads (you can enable later with proper policies)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE members DISABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFY DATA
-- ============================================

SELECT 'USERS TABLE:' as info;
SELECT id, name, email, role, designation FROM users;

SELECT 'MEMBERS TABLE:' as info;
SELECT id, name, email, member_type FROM members;

-- ============================================
-- LOGIN CREDENTIALS
-- ============================================
/*
After running this script, you can login with:

ADMIN:
- Email: poweldayck@gmail.com
- Password: Password123

HR MANAGER:
- Email: hr@vybeafrica.org
- Password: Password123

PROGRAMS:
- Email: programs@vybeafrica.org
- Password: Password123

STAFF:
- Email: field@vybeafrica.org
- Password: Password123

NOTE: Password123 is the default password for all sample users.
Change these passwords after first login!
*/
