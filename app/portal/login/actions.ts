"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateLogin } from "@/lib/auth/validation";
import { isLocked } from "@/lib/auth/lockout";

export interface LoginState {
  error?: string;
}

const GENERIC = "Invalid email or password.";

/**
 * Read the lockout row. Returns null when the table is unreachable or the
 * service key is unwired (local dev without service_role): lockout is then
 * skipped with a warning, never failed closed — production exit proof runs
 * WITH the key wired, where this path is mandatory.
 */
async function readLockout(email: string) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("login_attempts")
      .select("fail_count, window_start, locked_until")
      .eq("email", email)
      .maybeSingle();
    if (error) {
      console.warn("lockout read failed; continuing without lockout check.");
      return null;
    }
    return data;
  } catch {
    console.warn("lockout unavailable (no service key); continuing.");
    return null;
  }
}

async function writeLockout(email: string) {
  // Atomic server-side increment (private.record_login_failure): concurrent
  // failures serialize on the row lock, so no increment is ever lost.
  // Semantics mirror lib/auth/lockout.ts nextFailState — change both.
  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc("record_login_failure", {
      p_email: email,
    });
    if (error) {
      console.warn("lockout write failed; continuing.");
    }
  } catch {
    console.warn("lockout unavailable (no service key); continuing.");
  }
}

async function clearLockout(email: string) {
  try {
    const admin = createAdminClient();
    await admin.from("login_attempts").delete().eq("email", email);
  } catch {
    // Best-effort reset; a stale counter self-heals via window expiry.
  }
}

/**
 * Password login. Every failure returns the same generic error: bad password,
 * unknown email, active lockout, and unavailable lockout store are
 * indistinguishable (no oracle).
 */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = validateLogin(formData.get("email"), formData.get("password"));
  if (!parsed.ok) {
    return { error: GENERIC };
  }
  const now = Date.now();
  const lockRow = await readLockout(parsed.value.email);
  if (lockRow && isLocked(lockRow, now)) {
    return { error: GENERIC };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.value);
  if (error) {
    await writeLockout(parsed.value.email);
    return { error: GENERIC };
  }
  await clearLockout(parsed.value.email);
  redirect("/portal");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
