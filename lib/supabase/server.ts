import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

/**
 * Server-side Supabase client for Server Components, Route Handlers and
 * Server Actions. Reads the middleware-refreshed session cookie and writes
 * rotated cookies back via next/headers.
 *
 * Anon key only. Service_role clients live in server-only admin paths
 * (webhooks / admin jobs) and are never created here.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component (read-only context) — the
          // middleware refresh path owns cookie writes in that case.
        }
      },
    },
  });
}
