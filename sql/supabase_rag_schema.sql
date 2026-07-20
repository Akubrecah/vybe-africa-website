-- ============================================================
-- Bonga na Vybe — RAG Knowledge Base Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- BEFORE running, enable vector extension:
--   Dashboard → Database → Extensions → search "vector" → Enable
-- ============================================================

-- 1. Enable pgvector
create extension if not exists vector;

-- 2. Main documents table
create table if not exists bonga_documents (
  id          bigserial primary key,
  content     text        not null,
  embedding   vector(768),
  source_url  text,
  source_name text,
  pillar      text        check (pillar in ('srhr','climate','child_protection','governance')),
  title       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 3. Index for fast cosine similarity search
create index if not exists bonga_documents_embedding_idx
  on bonga_documents
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 4. Index for pillar filtering
create index if not exists bonga_documents_pillar_idx
  on bonga_documents (pillar);

-- 5. Similarity search function (used by the RAG pipeline)
create or replace function match_bonga_documents(
  query_embedding vector(768),
  match_threshold float  default 0.5,
  match_count     int    default 6,
  filter_pillar   text   default null
)
returns table (
  id          bigint,
  content     text,
  source_url  text,
  source_name text,
  pillar      text,
  title       text,
  similarity  float
)
language sql stable
as $$
  select
    id,
    content,
    source_url,
    source_name,
    pillar,
    title,
    1 - (embedding <=> query_embedding) as similarity
  from bonga_documents
  where
    (filter_pillar is null or pillar = filter_pillar)
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- 6. Chat history table (optional — for analytics)
create table if not exists bonga_chat_logs (
  id          bigserial primary key,
  session_id  text,
  role        text check (role in ('user','assistant')),
  message     text,
  pillar      text,
  created_at  timestamptz default now()
);
