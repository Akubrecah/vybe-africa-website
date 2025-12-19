-- Add phone and bio columns to existing users table
-- Run this in Supabase SQL Editor if users table already exists

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
