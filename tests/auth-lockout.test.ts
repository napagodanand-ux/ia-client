import { describe, expect, test } from "vitest";
import { LOCK_MS, MAX_FAILS, isLocked, nextFailState, type LockoutRow } from "../lib/auth/lockout";

const NOW = Date.parse("2026-09-28T12:00:00Z");

function row(over: Partial<LockoutRow>): LockoutRow {
  return {
    fail_count: 1,
    window_start: new Date(NOW - 60_000).toISOString(),
    locked_until: null,
    ...over,
  };
}

describe("lockout transitions", () => {
  test("no row is never locked; first failure opens a window", () => {
    expect(isLocked(null, NOW)).toBe(false);
    const o = nextFailState(null, NOW);
    expect(o.fail_count).toBe(1);
    expect(o.locked_until).toBeNull();
  });

  test("fourth failure stays open; fifth locks for 15 minutes", () => {
    const fourth = nextFailState(row({ fail_count: 3 }), NOW);
    expect(fourth.fail_count).toBe(4);
    expect(fourth.locked_until).toBeNull();
    expect(isLocked({ ...row({}), ...fourth }, NOW)).toBe(false);
    const fifth = nextFailState(row({ fail_count: 4 }), NOW);
    expect(fifth.fail_count).toBe(MAX_FAILS);
    expect(Date.parse(fifth.locked_until ?? "")).toBe(NOW + LOCK_MS);
    expect(isLocked(row({ fail_count: 5, locked_until: fifth.locked_until }), NOW)).toBe(true);
  });

  test("locked rejects even the correct password path (caller enforces)", () => {
    const locked = row({
      fail_count: 5,
      locked_until: new Date(NOW + 60_000).toISOString(),
    });
    expect(isLocked(locked, NOW)).toBe(true);
    expect(isLocked(locked, NOW + LOCK_MS + 1000)).toBe(false);
  });

  test("stale window resets instead of accumulating", () => {
    const stale = row({
      fail_count: 4,
      window_start: new Date(NOW - 16 * 60_000).toISOString(),
    });
    const o = nextFailState(stale, NOW);
    expect(o.fail_count).toBe(1);
    expect(o.locked_until).toBeNull();
  });

  test("further failures inside the window keep the lock (no extension gaming)", () => {
    const locked = row({
      fail_count: 7,
      locked_until: new Date(NOW + 60_000).toISOString(),
    });
    const o = nextFailState(locked, NOW);
    expect(o.fail_count).toBe(8);
    expect(o.locked_until).toBe(locked.locked_until);
  });

  test("a locked row with an aged window stays locked (ordering guard)", () => {
    const lockedStaleWindow = row({
      fail_count: 5,
      window_start: new Date(NOW - 20 * 60_000).toISOString(),
      locked_until: new Date(NOW + 60_000).toISOString(),
    });
    expect(isLocked(lockedStaleWindow, NOW)).toBe(true);
    const o = nextFailState(lockedStaleWindow, NOW);
    expect(o.locked_until).toBe(lockedStaleWindow.locked_until);
    expect(o.fail_count).toBe(6);
  });
});
