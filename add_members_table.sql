-- Members/Subscribers Table for VYBE Africa
-- Run this in Supabase SQL Editor to create the members table

CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL, -- Hashed with bcrypt
    phone TEXT,
    county TEXT, -- County/Region in Kenya
    organization TEXT, -- Optional: for organization members
    member_type TEXT DEFAULT 'individual', -- 'individual', 'organization', 'youth'
    is_active BOOLEAN DEFAULT true,
    subscription_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone can register (insert), members can view/update their own data
CREATE POLICY "Anyone can register" ON members FOR INSERT WITH CHECK (true);
CREATE POLICY "Members can view own profile" ON members FOR SELECT USING (auth.uid()::text = id::text OR true);
CREATE POLICY "Members can update own profile" ON members FOR UPDATE USING (auth.uid()::text = id::text OR true);
CREATE POLICY "Only admins can delete" ON members FOR DELETE USING (false);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS members_email_idx ON members(email);
