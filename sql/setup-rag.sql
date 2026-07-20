-- ============================================================
-- VYBE AFRICA RAG DATABASE SETUP
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create documents table
CREATE TABLE IF NOT EXISTS bonga_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  pillar TEXT NOT NULL,  -- srhr, climate, child_protection, governance
  title TEXT,
  source_url TEXT DEFAULT '#',
  content TEXT NOT NULL,
  embedding VECTOR(768),  -- text-embedding-004 produces 768 dimensions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create index for vector similarity search
CREATE INDEX IF NOT EXISTS bonga_documents_embedding_idx 
  ON bonga_documents 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 4. Create RPC function for similarity search
CREATE OR REPLACE FUNCTION match_bonga_documents(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.45,
  match_count INT DEFAULT 6,
  filter_pillar TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source_name TEXT,
  pillar TEXT,
  title TEXT,
  source_url TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bd.id,
    bd.source_name,
    bd.pillar,
    bd.title,
    bd.source_url,
    bd.content,
    1 - (bd.embedding <=> query_embedding) AS similarity
  FROM bonga_documents bd
  WHERE (filter_pillar IS NULL OR bd.pillar = filter_pillar)
    AND bd.embedding IS NOT NULL
    AND 1 - (bd.embedding <=> query_embedding) > match_threshold
  ORDER BY bd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. Enable RLS (Row Level Security)
ALTER TABLE bonga_documents ENABLE ROW LEVEL SECURITY;

-- Allow public read access for RAG queries
CREATE POLICY "Allow public read access" ON bonga_documents
  FOR SELECT USING (true);

-- Allow insert/update via service role (ingest API)
CREATE POLICY "Allow service role insert" ON bonga_documents
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service role update" ON bonga_documents
  FOR UPDATE USING (true);

-- 6. Create documents table for ingested source tracking
CREATE TABLE IF NOT EXISTS ingested_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT UNIQUE NOT NULL,
  pillar TEXT NOT NULL,
  chunks_count INT DEFAULT 0,
  source_url TEXT DEFAULT '#',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ingested_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read ingested_sources" ON ingested_sources
  FOR SELECT USING (true);

CREATE POLICY "Allow service role upsert ingested_sources" ON ingested_sources
  FOR INSERT WITH CHECK (true)
  ON CONFLICT (source_name) DO UPDATE SET
    chunks_count = EXCLUDED.chunks_count,
    updated_at = NOW();

-- 7. Verify setup
SELECT 'Tables created successfully' AS status;