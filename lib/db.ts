import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/**
 * SQL tag backed by Neon's serverless (HTTP) driver — works on Vercel's
 * serverless functions with no connection pooling to manage.
 *
 * DATABASE_URL is injected automatically when you add Neon from the Vercel
 * dashboard (Storage > Neon). For local dev, copy it into .env.local.
 *
 * The client is created lazily on first query, not at import time, so `next
 * build` (which imports every route to collect metadata) doesn't require the
 * connection string to be present at build time.
 *
 * There is no Row-Level Security here (Neon has no auth layer): every query in
 * this app MUST scope by user_id explicitly. See lib/auth.ts.
 */
let client: NeonQueryFunction<false, false> | null = null;

function db(): NeonQueryFunction<false, false> {
  if (!client) client = neon(process.env.DATABASE_URL!);
  return client;
}

export const sql: NeonQueryFunction<false, false> = ((
  strings: TemplateStringsArray,
  ...params: unknown[]
) => db()(strings, ...params)) as NeonQueryFunction<false, false>;
