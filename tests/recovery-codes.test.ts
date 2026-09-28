import { describe, expect, test } from "vitest";
import {
  generateRecoveryCodes,
  hashRecoveryCode,
  normalizeRecoveryCode,
  verifyRecoveryCode,
} from "../lib/auth/recovery-codes";

const CODE_RE = /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

describe("recovery codes", () => {
  test("generates 10 unique Crockford codes with argon2id hashes", async () => {
    const pairs = await generateRecoveryCodes();
    expect(pairs).toHaveLength(10);
    const codes = pairs.map((p) => p.code);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) {
      expect(code).toMatch(CODE_RE);
    }
    for (const { hash } of pairs) {
      expect(hash.startsWith("$argon2id$")).toBe(true);
      expect(hash.length).toBeGreaterThanOrEqual(50);
    }
    const hashes = pairs.map((p) => p.hash);
    expect(new Set(hashes).size).toBe(10);
  }, 60000);

  test("a generated code verifies against its own hashes", async () => {
    const pairs = await generateRecoveryCodes(3);
    const hashes = pairs.map((p) => p.hash);
    const first = pairs[0];
    if (!first) {
      throw new Error("Expected at least one pair.");
    }
    expect(await verifyRecoveryCode(first.code, hashes)).toBe(true);
  }, 60000);

  test("wrong, tampered, and empty codes fail", async () => {
    const pairs = await generateRecoveryCodes(2);
    const hashes = pairs.map((p) => p.hash);
    expect(await verifyRecoveryCode("0000-0000", hashes)).toBe(false);
    const first = pairs[0];
    if (!first) {
      throw new Error("Expected at least one pair.");
    }
    const tampered = first.code.slice(0, -1) + (first.code.endsWith("0") ? "1" : "0");
    expect(await verifyRecoveryCode(tampered, hashes)).toBe(false);
    expect(await verifyRecoveryCode("", hashes)).toBe(false);
    expect(await verifyRecoveryCode("short", hashes)).toBe(false);
  }, 60000);

  test("entry is case/space/dash tolerant via normalization", () => {
    expect(normalizeRecoveryCode("abcd-1234")).toBe("ABCD1234");
    expect(normalizeRecoveryCode(" ab cd 12 34 ")).toBe("ABCD1234");
  });

  test("count bounds are enforced", async () => {
    await expect(generateRecoveryCodes(0)).rejects.toThrowError(/1 to 20/);
    await expect(generateRecoveryCodes(21)).rejects.toThrowError(/1 to 20/);
  });

  test("direct hash round-trips through argon2Verify", async () => {
    const hash = await hashRecoveryCode("ABCD-1234");
    expect(await verifyRecoveryCode("ABCD-1234", [hash])).toBe(true);
    expect(await verifyRecoveryCode("ABCD-1235", [hash])).toBe(false);
  }, 60000);
});
