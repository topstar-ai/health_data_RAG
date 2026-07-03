import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const runtime = "nodejs";

// GET: the caller's own audit log (scoped by user_id — the app-level equivalent
// of the Row-Level Security that Supabase used to enforce at the DB layer).
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await sql`
    select created_at, query, grounded, latency_ms
    from query_log
    where user_id = ${userId}::uuid
    order by created_at desc
    limit 50
  `;

  return NextResponse.json({ rows });
}
