import type { NextRequest } from "next/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve the caller's user id from the Bearer token.
 *
 * This Vercel-only build has no auth provider. The browser generates a random
 * UUID once (stored in localStorage) and sends it as the bearer token; we accept
 * any well-formed UUID and use it to scope every DB query, keeping each browser's
 * data separate.
 *
 * NOTE: a UUID is an unguessable handle, not an authenticated identity. It's fine
 * for isolating demo data per browser, but it is NOT a substitute for real auth
 * if this app ever stores sensitive or truly multi-tenant data.
 */
export function getUserId(req: NextRequest): string | null {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  return UUID_RE.test(token) ? token : null;
}
