# rag-doc-qa — Grounded Document Q&A

Upload documents, ask questions, and get answers **grounded in the source with
citations** — with an honest "the documents don't contain this" when they don't.
Built on Neon (Postgres + pgvector) and deployed on Vercel — no external accounts
beyond your Vercel dashboard.

> **Live demo:** _add your Vercel URL here_
> **Walkthrough (90s):** _add your Loom link here_

Retrieval-augmented generation over a document knowledge base: metadata
classification, per-browser data isolation, and an audit log of every retrieval.
Everything the README claims is verifiable by clicking around the live app.

---

## Architecture

```
        ┌─────────┐   extract    ┌────────┐  embed   ┌──────────────┐
 file → │ /ingest │ ──────────→  │ chunk  │ ───────→ │  pgvector     │
        └─────────┘   classify   └────────┘          │  (chunks tbl) │
                                                      └──────┬───────┘
                                                             │ cosine
 question → ┌────────┐  embed → cosine top-5 (pgvector) ─────┘
            │ /query │ → grounded generation w/ citations → answer + sources
            └───┬────┘
                └──────────────→ query_log (audit: query, chunk ids, latency)
```

**Flow:** ingest → chunk (~500 tokens, 50 overlap) → embed → store in pgvector →
cosine retrieval scoped to the user → grounded generation with citations → refuse
when unsupported → log every query.

---

## Stack

- **Next.js 14 (App Router) + TypeScript** — deploys natively to Vercel
- **Neon** — serverless Postgres + pgvector, added from the Vercel dashboard
- **Embeddings** — OpenAI `text-embedding-3-small` (1536 dims)
- **Generation** — OpenAI `gpt-4o-mini` (swappable behind `lib/llm.ts`)
- **PDF parsing** — `pdf-parse`

---

## How retrieval works

Each chunk is embedded into a 1536-dimension vector and stored in a `vector` column
indexed with pgvector's IVFFlat index. At query time the question is embedded with
the same model, and the `/query` route ranks chunks by cosine distance
(`embedding <=> query_embedding`), returning the top 5 for the asking user only.
Those chunks — and nothing else — are handed to the model with a strict instruction
to answer **only** from them and cite the source filename. If the answer isn't in
the retrieved context, the model returns the exact string
`The documents don't contain this.` rather than inventing one. That refusal is the
point: the system won't answer beyond its evidence.

---

## Setup

### 1. Database (Neon, via Vercel)
1. In the [Vercel dashboard](https://vercel.com), open your project → **Storage →
   Create Database → Neon**. This provisions serverless Postgres and injects
   `DATABASE_URL` into your project automatically — no separate Neon account.
2. Open the **Neon SQL Editor** (or `psql "$DATABASE_URL"`) → paste and run
   [`db/schema.sql`](db/schema.sql). This enables pgvector and creates the tables
   and indexes.

### 2. Environment
Copy [`.env.example`](.env.example) to `.env.local` and fill in:

```
DATABASE_URL=          # from Neon (auto-set on Vercel; copy it for local dev)
OPENAI_API_KEY=
```

### 3. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000, upload [`sample-docs/acme-msa.md`](sample-docs/acme-msa.md),
and try:
- _"What are the payment terms?"_ → grounded answer with a citation.
- _"What is the CEO's salary?"_ → `The documents don't contain this.`

### 4. Deploy
Push to GitHub, import into [Vercel](https://vercel.com). `DATABASE_URL` is already
set by the Neon integration; add `OPENAI_API_KEY`, then deploy. Put the live URL at
the top of this README.

---

## Security

- **Per-browser isolation** — each browser generates a random UUID (kept in
  `localStorage`) that is sent as a bearer token; every DB query is scoped with
  `where user_id = $1`, so one browser never sees another's data. This is
  unguessable-handle isolation for a demo, **not** authenticated identity — see the
  note below.
- **`DATABASE_URL` stays server-side** — all reads/writes happen in the API routes,
  never from the browser. The client only ever holds its own UUID.
- **Audit log** — `query_log` records every query, the chunk ids retrieved, the
  answer, whether it was grounded, and latency. It's visible in the UI.

> **Want real auth?** Because Neon has no built-in auth layer (unlike Supabase's
> Row-Level Security), isolation here is enforced in application code. For genuine
> multi-tenant security, add an auth provider (Auth.js, Clerk) and derive `user_id`
> from a verified session instead of a client-supplied UUID.

---

## Project structure

```
app/
  page.tsx              upload + ask + audit-log panels
  api/ingest/route.ts   file → extract → chunk → classify → embed → store
  api/query/route.ts    embed → retrieve → generate → log → return
  api/log/route.ts      the caller's own audit-log rows (scoped by user id)
lib/
  db.ts                 Neon serverless SQL client
  auth.ts               resolve user id from bearer token (UUID)
  embeddings.ts         embed() / embedBatch()
  chunking.ts           recursive splitter (~500 tokens, 50 overlap)
  pdf.ts                extractText()
  llm.ts                generateAnswer() / classifyDocument()
db/schema.sql           tables + pgvector index
sample-docs/            a document to test with
```
