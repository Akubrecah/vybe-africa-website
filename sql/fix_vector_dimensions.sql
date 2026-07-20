-- ============================================================
-- VYBE AFRICA — Fix vector dimension mismatch
-- gemini-embedding-001 outputs 3072 dimensions, not 768
--
-- Run this in Supabase SQL Editor ONCE.
-- It drops the old ivfflat index, alters the column type,
-- drops and recreates the RPC function, then rebuilds the index.
-- ============================================================

-- 1. Drop the old index (required before altering column type)
DROP INDEX IF EXISTS bonga_documents_embedding_idx;

-- 2. Clear existing embeddings (they were 768-dim and are now invalid)
UPDATE bonga_documents SET embedding = NULL;

-- 3. Alter column to 3072 dimensions (gemini-embedding-001)
ALTER TABLE bonga_documents
  ALTER COLUMN embedding TYPE vector(3072)
  USING embedding::vector(3072);

-- 4. Recreate the similarity search function with correct dimension
CREATE OR REPLACE FUNCTION match_bonga_documents(
  query_embedding VECTOR(3072),
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

-- 5. Recreate index for 3072-dim vectors
--    Note: ivfflat lists should be ~sqrt(row_count). 100 is fine for < 10k docs.
CREATE INDEX bonga_documents_embedding_idx
  ON bonga_documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 6. Verify
SELECT
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'bonga_documents'
  AND column_name = 'embedding';
