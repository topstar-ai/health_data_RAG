-- rag-doc-qa — database setup for a Vercel + Neon (Postgres + pgvector) deploy.
-- Run this once against your Neon database: paste it into the Neon SQL Editor
-- (Neon dashboard > SQL Editor), or run `psql "$DATABASE_URL" -f db/schema.sql`.

-- 1. pgvector -----------------------------------------------------------------
create extension if not exists vector;

-- 2. Tables -------------------------------------------------------------------
-- There is no auth provider here, so user_id is a client-generated UUID (see
-- lib/auth.ts) rather than a foreign key into an auth table.
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  filename text not null,
  content_type text,
  doc_type text,                       -- classification e.g. 'contract','report','note'
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade not null,
  user_id uuid not null,
  chunk_index int,
  content text not null,
  token_count int,
  embedding vector(1536),
  created_at timestamptz default now()
);

create table if not exists query_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  query text,
  retrieved_chunk_ids uuid[],
  answer text,
  grounded boolean,                    -- did the model answer from context or refuse
  latency_ms int,
  created_at timestamptz default now()
);

-- 3. Indexes ------------------------------------------------------------------
-- Vector index for cosine retrieval.
create index if not exists chunks_embedding_idx
  on chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Per-user scoping is enforced in application SQL (there is no Row-Level
-- Security without an auth layer), so index the columns we filter on.
create index if not exists chunks_user_idx on chunks (user_id);
create index if not exists query_log_user_idx on query_log (user_id, created_at desc);
