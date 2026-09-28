/**
 * Auth input validation (ia-client). Client-side hints + server-action
 * pre-checks only — Supabase Auth and the database CHECKs are the authority
 * (password length/breach via Auth config, content rules via 0004 CHECKs).
 * Signup collects NO role: access is decided by approval/invitation only.
 */

export interface SignupInput {
  email: string;
  password: string;
  orgName: string;
  businessNeed: string;
}

const SIGNUP_KEYS = ["email", "password", "orgName", "businessNeed"] as const;

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | null {
  const v = email.trim();
  if (v.length === 0 || v.length > 254) {
    return "Enter an email address.";
  }
  if (!EMAIL_RE.test(v)) {
    return "Enter a valid email address.";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 12) {
    return "Password must be at least 12 characters.";
  }
  if (password.length > 256) {
    return "Password must be at most 256 characters.";
  }
  return null;
}

export function validateOrgName(orgName: string): string | null {
  const v = orgName.trim();
  if (v.length < 2 || v.length > 120) {
    return "Organisation name must be 2 to 120 characters.";
  }
  return null;
}

export function validateBusinessNeed(businessNeed: string): string | null {
  const v = businessNeed.trim();
  if (v.length < 10 || v.length > 2000) {
    return "Business need must be 10 to 2000 characters.";
  }
  return null;
}

/**
 * Validate a signup payload. Rejects unknown keys (a `role` smuggled into
 * the payload fails here before it ever reaches Auth or the database).
 */
export function validateSignup(
  input: Record<string, unknown>,
): { ok: true; value: SignupInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const keys = Object.keys(input).sort();
  const expected = [...SIGNUP_KEYS].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    errors.push("Unexpected signup fields.");
    return { ok: false, errors };
  }
  const { email, password, orgName, businessNeed } = input as Record<string, string>;
  if (typeof email !== "string") {
    errors.push("Enter an email address.");
  } else {
    const e = validateEmail(email);
    if (e) {
      errors.push(e);
    }
  }
  if (typeof password !== "string") {
    errors.push("Password must be at least 12 characters.");
  } else {
    const e = validatePassword(password);
    if (e) {
      errors.push(e);
    }
  }
  if (typeof orgName !== "string") {
    errors.push("Organisation name must be 2 to 120 characters.");
  } else {
    const e = validateOrgName(orgName);
    if (e) {
      errors.push(e);
    }
  }
  if (typeof businessNeed !== "string") {
    errors.push("Business need must be 10 to 2000 characters.");
  } else {
    const e = validateBusinessNeed(businessNeed);
    if (e) {
      errors.push(e);
    }
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  // Canonical form: trimmed + lowercased (no citext extension on the project;
  // every email-keyed read/write — lockout rows, request rows, RPC joins —
  // must use this form).
  return {
    ok: true,
    value: {
      email: (email as string).trim().toLowerCase(),
      password: password as string,
      orgName: (orgName as string).trim(),
      businessNeed: (businessNeed as string).trim(),
    },
  };
}

export function validateLogin(
  email: unknown,
  password: unknown,
): { ok: true; value: { email: string; password: string } } | { ok: false } {
  // Login failures always return the same generic error (no oracle).
  if (typeof email !== "string" || typeof password !== "string") {
    return { ok: false };
  }
  if (validateEmail(email) !== null || password.length === 0) {
    return { ok: false };
  }
  return { ok: true, value: { email: email.trim().toLowerCase(), password } };
}
