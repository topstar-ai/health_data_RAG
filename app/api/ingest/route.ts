import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { extractText } from "@/lib/pdf";
import { chunkText } from "@/lib/chunking";
import { embedBatch } from "@/lib/embeddings";
import { classifyDocument } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_EXT = [".pdf", ".txt", ".md"];

// POST: file -> extract -> chunk -> classify -> embed -> store
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const lname = file.name.toLowerCase();
  if (!ALLOWED_EXT.some((ext) => lname.endsWith(ext))) {
    return NextResponse.json(
      { error: "Only .pdf, .txt, and .md files are supported" },
      { status: 400 },
    );
  }

  // 1. Extract
  let text: string;
  try {
    text = await extractText(file);
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to read file: ${(e as Error).message}` },
      { status: 422 },
    );
  }
  if (!text.trim()) {
    return NextResponse.json(
      { error: "No extractable text in file" },
      { status: 422 },
    );
  }

  // 2. Chunk
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    return NextResponse.json({ error: "Nothing to index" }, { status: 422 });
  }

  // 3. Classify + 4. Embed (in parallel)
  const [docType, embeddings] = await Promise.all([
    classifyDocument(text),
    embedBatch(chunks.map((c) => c.content)),
  ]);

  // 5. Insert document row
  let docId: string;
  try {
    const inserted = await sql`
      insert into documents (user_id, filename, content_type, doc_type, metadata)
      values (
        ${userId}::uuid,
        ${file.name},
        ${file.type || null},
        ${docType},
        ${JSON.stringify({ chunk_count: chunks.length })}::jsonb
      )
      returning id
    `;
    docId = inserted[0].id as string;
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Failed to store document" },
      { status: 500 },
    );
  }

  // 6. Insert all chunk rows in one round trip via unnest. Embeddings go in as
  // their text form "[...]" and are cast to vector.
  const indices = chunks.map((c) => c.index);
  const contents = chunks.map((c) => c.content);
  const tokens = chunks.map((c) => c.tokenCount);
  const embStrings = embeddings.map((e) => JSON.stringify(e));

  try {
    await sql`
      insert into chunks
        (document_id, user_id, chunk_index, content, token_count, embedding)
      select
        ${docId}::uuid, ${userId}::uuid, t.idx, t.content, t.tok, t.emb::vector
      from unnest(
        ${indices}::int[],
        ${contents}::text[],
        ${tokens}::int[],
        ${embStrings}::text[]
      ) as t(idx, content, tok, emb)
    `;
  } catch (e) {
    // Roll back the orphaned document so a retry starts clean.
    await sql`delete from documents where id = ${docId}::uuid`;
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  return NextResponse.json({
    document_id: docId,
    filename: file.name,
    doc_type: docType,
    chunk_count: chunks.length,
  });
}
