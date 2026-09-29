/**
 * Lockout transition table (W2 / REQ-BP-05-04, A-15 carve-out).
 * Pure logic — unit-tested as the semantic spec. Production writes go through
 * the atomic public.record_login_failure RPC (read-modify-write in the action
 * loses updates under concurrency — proven live). Semantics must stay
 * identical in both places: change both, re-run the concurrent probe.
 */

export const MAX_FAILS = 5;
export const WINDOW_MS = 15 * 60 * 1000;
export const LOCK_MS = 15 * 60 * 1000;

export interface LockoutRow {
  fail_count: number;
  window_start: string;
  locked_until: string | null;
}

export interface FailOutcome {
  fail_count: number;
  window_start: string;
  locked_until: string | null;
}

export function isLocked(row: LockoutRow | null, now: number): boolean {
  if (!row || !row.locked_until) {
    return false;
  }
  return Date.parse(row.locked_until) > now;
}

/** Compute the persisted state after one more failed attempt. */
export function nextFailState(row: LockoutRow | null, now: number): FailOutcome {
  // Already locked: count the attempt but NEVER extend the lock — extending
  // would let an attacker hold the lock indefinitely (DoS on the victim).
  // Checked FIRST: a locked row's window_start predates the lock, so the
  // stale test below must never see a locked row.
  if (row && isLocked(row, now)) {
    return {
      fail_count: row.fail_count + 1,
      window_start: row.window_start,
      locked_until: row.locked_until,
    };
  }
  // Fresh or stale window: start (or restart) the counter. Failures more
  // than WINDOW_MS apart never accumulate to a lock.
  if (!row || Date.parse(row.window_start) < now - WINDOW_MS) {
    return {
      fail_count: 1,
      window_start: new Date(now).toISOString(),
      locked_until: null,
    };
  }
  const fail_count = row.fail_count + 1;
  return {
    fail_count,
    window_start: row.window_start,
    // Lock only on crossing; normalize any expired value to NULL (mirrors
    // public.record_login_failure — change both, re-run the concurrent probe).
    locked_until:
      fail_count >= MAX_FAILS
        ? new Date(now + LOCK_MS).toISOString()
        : row.locked_until && Date.parse(row.locked_until) > now
          ? row.locked_until
          : null,
  };
}
