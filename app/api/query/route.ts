import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { embed } from "@/lib/embeddings";
import { generateAnswer, type RetrievedContext } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 60;

const MATCH_COUNT = 5;

// POST: embed query -> retrieve -> generate -> log -> return
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const query: string = (body.query ?? "").toString().trim();
  if (!query) {
    return NextResponse.json({ error: "Empty query" }, { status: 400 });
  }

  const started = Date.now();

  // 1. Embed the query. pgvector accepts the text form "[...]" cast to vector.
  const queryEmbedding = await embed(query);
  const vec = JSON.stringify(queryEmbedding);

  // 2. Retrieve top-K via cosine similarity (pgvector), scoped to this user, and
  // join in the filename/chunk_index we need for citations in one round trip.
  let hits: any[];
  try {
    hits = await sql`
      select c.id, c.document_id, c.content, c.chunk_index,
             d.filename,
             1 - (c.embedding <=> ${vec}::vector) as similarity
      from chunks c
      join documents d on d.id = c.document_id
      where c.user_id = ${userId}::uuid
      order by c.embedding <=> ${vec}::vector
      limit ${MATCH_COUNT}
    `;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const chunkIds = hits.map((h) => h.id as string);

  const contexts: RetrievedContext[] = hits.map((h) => ({
    filename: h.filename ?? "unknown",
    chunkIndex: h.chunk_index ?? 0,
    content: h.content,
  }));

  // 3. Generate a grounded answer (or refusal).
  const { answer, grounded } = await generateAnswer(query, contexts);

  const sources = hits.map((h) => ({
    filename: h.filename ?? "unknown",
    chunk_index: h.chunk_index ?? 0,
    similarity: Number(Number(h.similarity).toFixed(4)),
  }));

  const latencyMs = Date.now() - started;

  // 4. Audit log — every query, its retrieved chunk ids, answer, grounding, latency.
  await sql`
    insert into query_log
      (user_id, query, retrieved_chunk_ids, answer, grounded, latency_ms)
    values
      (${userId}::uuid, ${query}, ${chunkIds}, ${answer}, ${grounded}, ${latencyMs})
  `;

  return NextResponse.json({
    answer,
    grounded,
    sources: grounded ? sources : [],
    latency_ms: latencyMs,
  });
}
