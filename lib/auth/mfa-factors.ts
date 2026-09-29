/**
 * Caller-owned TOTP factor lookup (D-11 enrolment flow).
 *
 * Pure selection semantics over a supabase-js listFactors payload — the
 * callers (getOwnFactor, completion page) add their own status checks.
 *
 * NOTE: supabase-js files only VERIFIED factors into the per-type buckets;
 * unverified factors appear in `.all` only. Searching `.totp` makes
 * round-1 (unverified) factors invisible, so every round-1 submit fails
 * closed with a generic error. Always search `.all` here.
 */

/** Minimal view of one factor row from listFactors. */
export interface TotpFactorView {
  id: string;
  factor_type?: string;
  status?: string;
}

/** Minimal view of a listFactors payload. */
export interface FactorListView {
  totp?: TotpFactorView[];
  all?: TotpFactorView[];
}

/** Find the caller's TOTP factor by id, any status; null when absent. */
export function findCallerTotpFactor(
  list: FactorListView | null | undefined,
  factorId: string,
): TotpFactorView | null {
  const found = list?.all?.find((f) => f.id === factorId && f.factor_type === "totp") ?? null;
  return found;
}
