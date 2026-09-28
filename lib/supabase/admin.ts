import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

const SERVICE_ROLE_VAR = "SUPABASE_SERVICE_ROLE_KEY";

/**
 * Privileged server client (service_role). Server-only module — never import
 * from client components (enforced by review, not by tooling: keep this file
 * free of "use client" and out of browser bundles).
 *
 * Used for: approval transactions, owner-seed reads, and other paths where
 * RLS intentionally exposes zero app-role surface. Every RPC re-checks
 * authority in-SQL; this key is transport, not authorization.
 */
export function createAdminClient() {
  const { url } = getSupabaseEnv();
  const serviceKey = process.env[SERVICE_ROLE_VAR];
  if (!serviceKey) {
    throw new Error(`Missing ${SERVICE_ROLE_VAR} (server-only; wired via env, never committed).`);
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
