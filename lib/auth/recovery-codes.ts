import { argon2id, argon2Verify } from "hash-wasm";

// SERVER-ONLY. Never import from client components — this module handles
// plaintext recovery codes (shown once at enrolment/rotation, never stored,
// never logged). Hashes are argon2id PHC strings (D-11 §2, hashing-dep ruling).

// Crockford base32 without I/L/O/U (avoids 1/0 confusion on manual entry).
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const CODE_GROUPS = 2;
const GROUP_CHARS = 4;

const ARGON_PARAMS = {
  parallelism: 1,
  iterations: 3,
  memorySize: 65536, // 64 MiB
  hashLength: 32,
} as const;

export interface RecoveryCodePair {
  /** Plaintext code (`XXXX-XXXX`). Return to the user ONCE, then drop. */
  code: string;
  /** argon2id PHC hash. The only form ever persisted. */
  hash: string;
}

function randomGroup(): string {
  const bytes = new Uint8Array(GROUP_CHARS);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) {
    const idx = b % ALPHABET.length;
    out += ALPHABET[idx];
  }
  return out;
}

function randomCode(): string {
  return Array.from({ length: CODE_GROUPS }, randomGroup).join("-");
}

/** Normalize user-entered codes (case/space/dash tolerant) before verify. */
export function normalizeRecoveryCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "");
}

export async function hashRecoveryCode(code: string): Promise<string> {
  // Canonicalize before hashing so generation-time and verify-time forms agree
  // (verify normalizes user entry; hashing the raw form would never match).
  const canonical = normalizeRecoveryCode(code);
  if (canonical.length !== CODE_GROUPS * GROUP_CHARS) {
    throw new Error("Recovery-code hashing requires an 8-character code.");
  }
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const hash = await argon2id({
    password: canonical,
    salt,
    ...ARGON_PARAMS,
    outputType: "encoded",
  });
  if (typeof hash !== "string" || !hash.startsWith("$argon2id$")) {
    throw new Error("Recovery-code hashing produced an unexpected format.");
  }
  return hash;
}

/**
 * Generate `count` fresh codes with hashes. Plaintext codes exist only in the
 * returned array — persist hashes, show codes once, then drop the plaintext.
 */
export async function generateRecoveryCodes(count = 10): Promise<RecoveryCodePair[]> {
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new Error("Recovery-code count must be an integer from 1 to 20.");
  }
  const pairs: RecoveryCodePair[] = [];
  const seen = new Set<string>();
  while (pairs.length < count) {
    const code = randomCode();
    if (seen.has(code)) {
      continue;
    }
    seen.add(code);
    pairs.push({ code, hash: await hashRecoveryCode(code) });
  }
  return pairs;
}

/**
 * Check a presented code against unused hashes. Returns true on first match.
 * Single-use consumption (marking used_at) is the caller's database concern —
 * this function is pure comparison and never touches storage.
 */
export async function verifyRecoveryCode(input: string, unusedHashes: string[]): Promise<boolean> {
  const candidate = normalizeRecoveryCode(input);
  if (candidate.length !== CODE_GROUPS * GROUP_CHARS) {
    return false;
  }
  for (const hash of unusedHashes) {
    if (await argon2Verify({ password: candidate, hash })) {
      return true;
    }
  }
  return false;
}
