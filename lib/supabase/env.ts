const SUPABASE_URL_VAR = "NEXT_PUBLIC_SUPABASE_URL";
const SUPABASE_ANON_KEY_VAR = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/**
 * Resolve and validate the public Supabase connection values.
 *
 * Privileged server keys (admin API keys, payment secrets, signing keys)
 * must never appear here — they live in Netlify env vars / Supabase Vault
 * per D-12 and are only read by server-only code paths.
 *
 * Throws a descriptive Error when a value is missing or malformed so
 * misconfiguration fails fast instead of producing opaque client errors.
 */
export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env[SUPABASE_URL_VAR];
  const anonKey = process.env[SUPABASE_ANON_KEY_VAR];

  if (!url) {
    throw new Error(`Missing ${SUPABASE_URL_VAR} (Supabase project URL).`);
  }
  if (!anonKey) {
    throw new Error(`Missing ${SUPABASE_ANON_KEY_VAR} (Supabase anon key).`);
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid ${SUPABASE_URL_VAR}: not a parseable URL.`);
  }
  if (parsed.protocol !== "https:") {
    throw new Error(`Invalid ${SUPABASE_URL_VAR}: must use https.`);
  }

  return { url, anonKey };
}
