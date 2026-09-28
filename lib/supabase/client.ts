import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

type BrowserClient = ReturnType<typeof createBrowserClient>;

let browserClient: BrowserClient | null = null;

/**
 * Browser-side Supabase client (singleton).
 *
 * Uses the anon key only — RLS still gates every row server-side.
 * Never import service_role or any server secret into this module.
 */
export function createClient(): BrowserClient {
  if (browserClient) {
    return browserClient;
  }
  const { url, anonKey } = getSupabaseEnv();
  browserClient = createBrowserClient(url, anonKey);
  return browserClient;
}

/** Test-only reset for the module singleton. */
export function resetBrowserClientForTests(): void {
  browserClient = null;
}
