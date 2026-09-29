"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findCallerTotpFactor } from "@/lib/auth/mfa-factors";

export interface EnrolState {
  factorId?: string;
  qrCode?: string;
  secret?: string;
  uri?: string;
  error?: string;
}

const GENERIC = "Enrolment failed. Start over.";

/** Best-effort removal of the caller's own UNVERIFIED totp factors (abandoned
 *  setups whose QR was never scanned). Verified factors are never touched. */
async function cleanupUnverifiedFactors(): Promise<void> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    if (!data) {
      return;
    }
    for (const f of data.all) {
      // NOTE: match by exclusion (see findCallerTotpFactor): unverified
      // factors never appear in the per-type buckets.
      if (f.factor_type === "totp" && f.status !== "verified") {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }
  } catch {
    // Fallback path uses a unique friendly name instead.
  }
}

/** Whether the app-side enrolment row exists for the caller. */
async function hasEnrolmentRow(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }
    const admin = createAdminClient();
    const { data } = await admin
      .from("mfa_enrolments")
      .select("enrolled_at")
      .eq("user_id", user.id)
      .maybeSingle();
    return !!data?.enrolled_at;
  } catch {
    return false;
  }
}

/** Page state: clean start, resume-interrupted, or fully done. */
export async function enrolmentPageState(): Promise<"start" | "resume" | "done"> {
  const [verified, row] = await Promise.all([hasVerifiedTotp(), hasEnrolmentRow()]);
  if (row) {
    return "done";
  }
  if (verified) {
    // Native factor verified but the app flow never completed (interrupted
    // enrolment): offer completion instead of a dead end.
    return "resume";
  }
  return "start";
}

/**
 * Interrupted-enrolment verify: one fresh code against the already verified
 * factor, then redirect to completion (redirect-based delivery — see
 * verifyEnrol note).
 */
export async function resumeEnrolment(_prev: EnrolState, formData: FormData): Promise<EnrolState> {
  const code = formData.get("code");
  if (typeof code !== "string") {
    return { error: GENERIC };
  }
  let factorId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
    const factor = factors?.all.find((f) => f.factor_type === "totp" && f.status === "verified");
    if (listError || !factor) {
      return { error: GENERIC };
    }
    const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });
    if (challenge.error || !challenge.data) {
      return { error: GENERIC };
    }
    const verified = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.data.id,
      code: code.trim().replace(/\s/g, ""),
    });
    if (verified.error) {
      return { error: "Invalid code. Try again." };
    }
    factorId = factor.id;
  } catch {
    return { error: GENERIC };
  }
  redirect(`/enrol-mfa/complete?factor=${encodeURIComponent(factorId as string)}`);
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
    return data.all.some((f) => f.factor_type === "totp" && f.status === "verified");
  } catch {
    return false;
  }
}

/** Fetch the caller's factor by id; null unless it exists, is TOTP, and is
 *  caller-owned. Verified-status is checked by callers that need it.
 *  Selection semantics live in findCallerTotpFactor (staff
 *  app/enrol-mfa/actions.ts reference: per-type buckets omit unverified
 *  factors, so the lookup searches `.all`). */
async function getOwnFactor(factorId: string) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    return findCallerTotpFactor(data, factorId);
  } catch {
    return null;
  }
}

/**
 * Steps 2+3 as REDIRECTS (never action state): post-verify action state does
 * not reliably reach the client (rotation-bearing responses are superseded
 * by a fresh server render), while redirects apply 1:1. Round 1 success
 * routes to the round-2 form; round 2 success routes to the completion page,
 * which performs the slow hash+store during its own server render (with a
 * loading state) and is idempotent via the enrolment row.
 */
export async function verifyEnrol(_prev: EnrolState, formData: FormData): Promise<EnrolState> {
  const factorId = formData.get("factorId");
  const code = formData.get("code");
  const round = formData.get("round");
  if (typeof factorId !== "string" || typeof code !== "string") {
    return { error: GENERIC };
  }
  const factor = await getOwnFactor(factorId);
  if (!factor) {
    return { error: GENERIC };
  }
  const first = await verifyCode(factorId, code);
  if (!first.ok) {
    return { factorId, error: "Invalid code. Try again." };
  }
  if (round !== "2") {
    redirect(`/enrol-mfa?step=2&factor=${encodeURIComponent(factorId)}`);
  }
  redirect(`/enrol-mfa/complete?factor=${encodeURIComponent(factorId)}`);
}

export async function finishEnrol(): Promise<void> {
  redirect("/portal");
}
