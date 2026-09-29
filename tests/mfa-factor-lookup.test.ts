import { describe, expect, test } from "vitest";
import { findCallerTotpFactor } from "../lib/auth/mfa-factors";

const UNVERIFIED = {
  totp: [],
  all: [{ id: "f-round1", factor_type: "totp", status: "unverified" }],
};

const VERIFIED = {
  totp: [{ id: "f-live", factor_type: "totp", status: "verified" }],
  all: [{ id: "f-live", factor_type: "totp", status: "verified" }],
};

describe("caller-owned TOTP lookup", () => {
  test("finds a round-1 (unverified) factor invisible to per-type buckets", () => {
    expect(findCallerTotpFactor(UNVERIFIED, "f-round1")?.id).toBe("f-round1");
  });

  test("finds a verified factor", () => {
    expect(findCallerTotpFactor(VERIFIED, "f-live")?.id).toBe("f-live");
  });

  test("returns null for unknown ids and non-TOTP rows", () => {
    expect(findCallerTotpFactor(VERIFIED, "nope")).toBeNull();
    expect(findCallerTotpFactor(null, "f-live")).toBeNull();
    expect(
      findCallerTotpFactor(
        { totp: [], all: [{ id: "f-live", factor_type: "phone", status: "verified" }] },
        "f-live",
      ),
    ).toBeNull();
  });
});
