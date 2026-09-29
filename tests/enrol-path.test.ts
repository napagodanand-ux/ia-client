import { describe, expect, test } from "vitest";
import { isEnrolPath } from "../lib/auth/enrol-path";

describe("enrol-area predicate", () => {
  test("covers the enrol root and the completion subtree", () => {
    expect(isEnrolPath("/enrol-mfa")).toBe(true);
    expect(isEnrolPath("/enrol-mfa/complete")).toBe(true);
    expect(isEnrolPath("/enrol-mfa/")).toBe(true);
  });

  test("rejects lookalikes and unrelated routes", () => {
    expect(isEnrolPath("/enrol-mfa-evil")).toBe(false);
    expect(isEnrolPath("/enrol-mfax")).toBe(false);
    expect(isEnrolPath("/")).toBe(false);
    expect(isEnrolPath("/approvals")).toBe(false);
    expect(isEnrolPath("/login")).toBe(false);
  });
});
