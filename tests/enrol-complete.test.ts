import { describe, expect, test, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("@/lib/auth/recovery-codes", () => ({
  generateRecoveryCodes: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateRecoveryCodes } from "@/lib/auth/recovery-codes";
import CompletePage from "../app/enrol-mfa/complete/page";

const VERIFIED_ONLY_IN_ALL = {
  totp: [],
  all: [{ id: "f1", factor_type: "totp", status: "verified" }],
};

function mockClients() {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
      mfa: { listFactors: vi.fn().mockResolvedValue({ data: VERIFIED_ONLY_IN_ALL }) },
    },
  } as never);
  const maybeSingle = vi.fn().mockResolvedValue({ data: null });
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = maybeSingle;
  chain.upsert = vi.fn().mockResolvedValue({ error: null });
  chain.insert = vi.fn().mockResolvedValue({ error: null });
  vi.mocked(createAdminClient).mockReturnValue({ from: vi.fn().mockReturnValue(chain) } as never);
  vi.mocked(generateRecoveryCodes).mockResolvedValue(
    Array.from({ length: 10 }, (_, i) => ({ code: `CODE-${i}`, hash: `hash-${i}` })),
  );
}

function findText(node: unknown, text: string): boolean {
  if (typeof node === "string") {
    return node.includes(text);
  }
  if (Array.isArray(node)) {
    return node.some((n) => findText(n, text));
  }
  if (node && typeof node === "object") {
    const props = (node as { props?: unknown }).props as { children?: unknown } | undefined;
    return !!props && findText(props.children, text);
  }
  return false;
}

describe("enrolment completion page", () => {
  test("verified factor visible only via .all still completes with 10 codes", async () => {
    mockClients();
    const el = (await CompletePage({
      searchParams: Promise.resolve({ factor: "f1" }),
    })) as unknown;
    expect(findText(el, "Save recovery codes")).toBe(true);
  });

  test("unknown factor renders the generic error (no codes)", async () => {
    mockClients();
    const el = (await CompletePage({
      searchParams: Promise.resolve({ factor: "nope" }),
    })) as unknown;
    expect(findText(el, "Enrolment failed. Start over.")).toBe(true);
    expect(findText(el, "Save recovery codes")).toBe(false);
  });
});
