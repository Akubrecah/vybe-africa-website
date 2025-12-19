-- VYBE AFRICA TEAM MEMBERS - STAFF ACCOUNTS
-- Run this in Supabase SQL Editor

-- ============================================
-- DROP AND RECREATE USERS TABLE
-- ============================================

DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
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

-- Disable RLS so login works
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- ============================================
-- INSERT REAL TEAM MEMBERS
-- ============================================
-- Password for all: "Vybe2024" (hashed with bcrypt)
-- bcrypt hash generated for "Vybe2024"

INSERT INTO users (name, email, password, role, designation, phone) VALUES

-- 1. Sharon Chepkite - Executive Director (ADMIN)
(
    'Sharon Chepkite',
    'sharon@vybeafrica.org',
    '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqzFE4t5fQuPZ7c6r8LxqwK8XKNPO',
    'superadmin',
    'Executive Director',
    '+254 700 000 001'
),

-- 2. Moses Kibet - Programs Manager
(
    'Moses Kibet',
    'moses@vybeafrica.org',
    '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqzFE4t5fQuPZ7c6r8LxqwK8XKNPO',
    'programs',
    'Programs Manager',
    '+254 700 000 002'
),

-- 3. Marcellina Cherubia - Communication Officer
(
    'Marcellina Cherubia',
    'marcellina@vybeafrica.org',
    '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqzFE4t5fQuPZ7c6r8LxqwK8XKNPO',
    'staff',
    'Communication Officer',
    '+254 700 000 003'
),

-- 4. Farex Nandwa - HR
(
    'Farex Nandwa',
    'farex@vybeafrica.org',
    '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqzFE4t5fQuPZ7c6r8LxqwK8XKNPO',
    'hr',
    'HR Manager',
    '+254 700 000 004'
),

-- 5. Tony Barasa - M&E
(
    'Tony Barasa',
    'tony@vybeafrica.org',
    '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqzFE4t5fQuPZ7c6r8LxqwK8XKNPO',
    'staff',
    'M&E Officer',
    '+254 700 000 005'
),

-- 6. Admin Account (You)
(
    'Akubrecah Entertainment',
    'poweldayck@gmail.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqzFE4t5fQuPZ7c6r8LxqwK8XKNPO',
    'superadmin',
    'System Admin',
    '+254 717 648 457'
);

-- ============================================
-- CREATE MEMBERS TABLE
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE members DISABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFY
-- ============================================

SELECT '✅ STAFF ACCOUNTS CREATED:' as status;
SELECT name, email, role, designation FROM users ORDER BY role;

/*
============================================
LOGIN CREDENTIALS (Password for all: Vybe2024)
============================================

ADMIN ACCOUNTS:
- sharon@vybeafrica.org / Vybe2024 → Admin Dashboard
- poweldayck@gmail.com / Vybe2024 → Admin Dashboard

HR ACCOUNT:
- farex@vybeafrica.org / Vybe2024 → HR Dashboard

PROGRAMS ACCOUNT:
- moses@vybeafrica.org / Vybe2024 → Programs Dashboard

STAFF ACCOUNTS:
- marcellina@vybeafrica.org / Vybe2024 → Staff Portal
- tony@vybeafrica.org / Vybe2024 → Staff Portal

============================================
*/
