-- ============================================================
-- Fix Bonga na Vybe Knowledge Base Permissions
-- Run this in your Supabase Dashboard → SQL Editor
-- This fixes PDF uploads not appearing in the knowledge base
-- ============================================================

-- Option A (Recommended for this setup): Disable RLS entirely on this table
-- The bonga_documents table is internal/server-only with no user-specific data
ALTER TABLE bonga_documents DISABLE ROW LEVEL SECURITY;

-- Option B (Alternative): Keep RLS but allow anon key full access
-- Uncomment these lines instead if you prefer to keep RLS enabled:
-- ALTER TABLE bonga_documents ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow anon full access" ON bonga_documents;
-- CREATE POLICY "Allow anon full access" ON bonga_documents
--   FOR ALL TO anon USING (true) WITH CHECK (true);

-- Verify the fix worked:
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'bonga_documents';
