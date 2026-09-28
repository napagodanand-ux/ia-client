"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateRecoveryCodes, type RecoveryCodePair } from "@/lib/auth/recovery-codes";

export interface EnrolState {
  factorId?: string;
  qrCode?: string;
  secret?: string;
  uri?: string;
  needsSecond?: boolean;
  codes?: string[];
  error?: string;
}

const GENERIC = "Enrolment failed. Start over.";

async function requireUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/** Best-effort removal of the caller's own UNVERIFIED totp factors (abandoned
 *  setups whose QR was never scanned). Verified factors are never touched. */
async function cleanupUnverifiedFactors(): Promise<void> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    if (!data) {
      return;
    }
    for (const f of data.totp) {
      // NOTE: the wire status for pending factors is "unverified" (observed
      // live); the client type only names "verified", so match by exclusion.
      if (f.status !== "verified") {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }
  } catch {
    // Fallback path uses a unique friendly name instead.
  }
}

/** Step 1: create the TOTP factor, return QR material for scanning. */
export async function startEnrol(): Promise<EnrolState> {
  try {
    const supabase = await createClient();
    const attempt = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "IA staff authenticator",
    });
    let data = attempt.data;
    // Name conflict (stale unverified factor from an abandoned setup):
    // remove the user's own unverified TOTP factors and retry once with the
    // stable name; fall back to a unique name if cleanup is refused.
    if (attempt.error && !data) {
      await cleanupUnverifiedFactors();
      const retry = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "IA staff authenticator",
      });
      if (retry.error || !retry.data) {
        const unique = await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: `IA staff authenticator ${Date.now()}`,
        });
        data = unique.data;
        if (unique.error || !data) {
          return { error: GENERIC };
        }
      } else {
        data = retry.data;
      }
    }
    if (!data || data.type !== "totp" || !data.totp) {
      return { error: GENERIC };
    }
    return {
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    };
  } catch {
    return { error: GENERIC };
  }
}

async function verifyCode(factorId: string, code: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error || !challenge.data) {
    return { ok: false };
  }
  const verified = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code: code.trim().replace(/\s/g, ""),
  });
  return { ok: !verified.error };
}

/** A verified TOTP factor must exist before round 2 is honored (anti-tamper:
 *  the hidden round flag alone never advances enrolment). */
async function hasVerifiedTotp(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error || !data) {
      return false;
    }
    return data.totp.some((f) => f.status === "verified");
  } catch {
    return false;
  }
}

/**
 * Steps 2+3: verify two consecutive codes, then complete enrolment:
 * write mfa_enrolments, generate + store recovery-code hashes, return the
 * plaintext codes EXACTLY ONCE (never logged, never emailed, never stored).
 */
export async function verifyEnrol(_prev: EnrolState, formData: FormData): Promise<EnrolState> {
  const factorId = formData.get("factorId");
  const code = formData.get("code");
  const round = formData.get("round");
  if (typeof factorId !== "string" || typeof code !== "string") {
    return { error: GENERIC };
  }
  const first = await verifyCode(factorId, code);
  if (!first.ok) {
    return { factorId, error: "Invalid code. Try again." };
  }
  if (round !== "2") {
    return { factorId, needsSecond: true };
  }
  if (!(await hasVerifiedTotp())) {
    return { error: GENERIC };
  }
  const userId = await requireUserId();
  if (!userId) {
    return { error: GENERIC };
  }
  let pairs: RecoveryCodePair[];
  try {
    pairs = await generateRecoveryCodes(10);
  } catch {
    return { error: GENERIC };
  }
  try {
    const admin = createAdminClient();
    const { error: enrolError } = await admin
      .from("mfa_enrolments")
      .upsert(
        { user_id: userId, enrolled_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    if (enrolError) {
      return { error: GENERIC };
    }
    const { error: codesError } = await admin.from("recovery_code_hashes").insert(
      pairs.map((p) => ({
        user_id: userId,
        algo: "argon2id",
        code_hash: p.hash,
        used_at: null,
        reset_batch: null,
      })),
    );
    if (codesError) {
      return { error: GENERIC };
    }
  } catch {
    return { error: GENERIC };
  }
  return { codes: pairs.map((p) => p.code) };
}

export async function finishEnrol(): Promise<void> {
  redirect("/portal");
}
