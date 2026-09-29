import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateRecoveryCodes } from "@/lib/auth/recovery-codes";

/**
 * Completion step (GET /enrol-mfa/complete?factor=<id>).
 * Runs the slow hash+store during its own server render (with streaming
 * loading UI) instead of inside an action response, because post-rotation
 * action state does not reliably reach the client while redirects apply 1:1.
 * Idempotent: an existing enrolment row renders "already set up" without
 * minting duplicate codes (double-submit safe).
 */
async function completeForFactor(
  factorId: string,
): Promise<{ codes: string[] } | { error: string } | { done: true }> {
  const GENERIC = "Enrolment failed. Start over.";
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: GENERIC };
    }
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp.find((f) => f.id === factorId && f.status === "verified");
    if (!factor) {
      return { error: GENERIC };
    }
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("mfa_enrolments")
      .select("enrolled_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing?.enrolled_at) {
      return { done: true };
    }
    let pairs;
    try {
      pairs = await generateRecoveryCodes(10);
    } catch {
      return { error: GENERIC };
    }
    const { error: enrolError } = await admin
      .from("mfa_enrolments")
      .upsert(
        { user_id: user.id, enrolled_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    if (enrolError) {
      return { error: GENERIC };
    }
    const { error: codesError } = await admin.from("recovery_code_hashes").insert(
      pairs.map((p) => ({
        user_id: user.id,
        algo: "argon2id",
        code_hash: p.hash,
        used_at: null,
        reset_batch: null,
      })),
    );
    if (codesError) {
      return { error: GENERIC };
    }
    return { codes: pairs.map((p) => p.code) };
  } catch {
    return { error: "Enrolment failed. Start over." };
  }
}

export default async function CompletePage({
  searchParams,
}: {
  searchParams: Promise<{ factor?: string }>;
}) {
  const params = await searchParams;
  if (!params.factor) {
    redirect("/enrol-mfa");
  }
  const result = await completeForFactor(params.factor);
  if ("done" in result) {
    return (
      <main>
        <h1>Set up authenticator</h1>
        <p>
          An authenticator is already set up on this account. To set up a new one, ask an Owner or
          Co-Founder for an MFA reset first.
        </p>
      </main>
    );
  }
  if ("error" in result) {
    return (
      <main>
        <h1>Set up authenticator</h1>
        <p role="alert">{result.error}</p>
      </main>
    );
  }
  return (
    <main>
      <h1>Save recovery codes</h1>
      <p>
        These 10 codes are shown once. They are never emailed or shown again. Each works once if you
        lose your authenticator.
      </p>
      <ol>
        {result.codes.map((c) => (
          <li key={c}>
            <code>{c}</code>
          </li>
        ))}
      </ol>
      <p>
        <Link href="/portal">Done</Link>
      </p>
    </main>
  );
}
