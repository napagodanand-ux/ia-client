import { describe, expect, test } from "vitest";
import {
  validateBusinessNeed,
  validateEmail,
  validateLogin,
  validateOrgName,
  validatePassword,
  validateSignup,
} from "../lib/auth/validation";

describe("auth validation", () => {
  test("accepts a valid signup payload", () => {
    const r = validateSignup({
      email: "founder@example.co",
      password: "correct-horse-12",
      orgName: "Example Co",
      businessNeed: "We need a content squad for launch.",
    });
    expect(r.ok).toBe(true);
  });

  test("rejects a smuggled role key", () => {
    const r = validateSignup({
      email: "founder@example.co",
      password: "correct-horse-12",
      orgName: "Example Co",
      businessNeed: "We need a content squad for launch.",
      role: "owner",
    });
    expect(r.ok).toBe(false);
  });

  test("rejects missing/extra keys", () => {
    expect(validateSignup({}).ok).toBe(false);
    expect(
      validateSignup({
        email: "a@b.co",
        password: "correct-horse-12",
        orgName: "AB",
        businessNeed: "0123456789",
        extra: 1,
      }).ok,
    ).toBe(false);
  });

  test("email boundaries", () => {
    expect(validateEmail("a@b.co")).toBeNull();
    expect(validateEmail("not-an-email")).not.toBeNull();
    expect(validateEmail("a@b")).not.toBeNull();
    expect(validateEmail("")).not.toBeNull();
    expect(validateEmail(`x@${"y".repeat(260)}.co`)).not.toBeNull();
  });

  test("password minimum 12", () => {
    expect(validatePassword("eleven-char")).not.toBeNull();
    expect(validatePassword("twelve-chars!")).toBeNull();
    expect(validatePassword("x".repeat(257))).not.toBeNull();
  });

  test("org/need lengths mirror the 0004 CHECKs", () => {
    expect(validateOrgName("A")).not.toBeNull();
    expect(validateOrgName("AB")).toBeNull();
    expect(validateBusinessNeed("too short")).not.toBeNull();
    expect(validateBusinessNeed("0123456789")).toBeNull();
    expect(validateBusinessNeed("x".repeat(2001))).not.toBeNull();
  });

  test("login never leaks which field failed", () => {
    expect(validateLogin("bad", "x")).toEqual({ ok: false });
    expect(validateLogin("a@b.co", "")).toEqual({ ok: false });
    expect(validateLogin("a@b.co", "whatever-12-long")).toEqual({
      ok: true,
      value: { email: "a@b.co", password: "whatever-12-long" },
    });
  });

  test("emails canonicalize to lowercase (no citext on project)", () => {
    const r = validateSignup({
      email: "Founder@Example.CO",
      password: "correct-horse-12",
      orgName: "Example Co",
      businessNeed: "We need a content squad for launch.",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.email).toBe("founder@example.co");
    }
    expect(validateLogin("User@X.Co", "whatever-12-long")).toEqual({
      ok: true,
      value: { email: "user@x.co", password: "whatever-12-long" },
    });
  });
});
