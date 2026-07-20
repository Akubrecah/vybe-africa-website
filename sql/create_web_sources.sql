-- ============================================================
-- Create table for managing crawler web sources per pillar
-- Run this in your Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS bonga_web_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  pillar TEXT NOT NULL CHECK (pillar IN ('srhr', 'climate', 'child_protection', 'governance')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (if desired, or disable for simplicity since it's admin-only)
ALTER TABLE bonga_web_sources DISABLE ROW LEVEL SECURITY;
