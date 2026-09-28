import { afterEach, describe, expect, test, vi } from "vitest";
import { createClient, resetBrowserClientForTests } from "../lib/supabase/client";

const URL_VAR = "NEXT_PUBLIC_SUPABASE_URL";
const ANON_VAR = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

afterEach(() => {
  resetBrowserClientForTests();
  vi.unstubAllEnvs();
});

describe("browser Supabase client", () => {
  test("constructs an auth-capable client without network access", () => {
    vi.stubEnv(URL_VAR, "https://example.supabase.co");
    vi.stubEnv(ANON_VAR, "test-anon-key");
    const client = createClient();
    expect(typeof client.auth.getSession).toBe("function");
    expect(typeof client.from).toBe("function");
  });

  test("returns the same instance on repeated calls", () => {
    vi.stubEnv(URL_VAR, "https://example.supabase.co");
    vi.stubEnv(ANON_VAR, "test-anon-key");
    expect(createClient()).toBe(createClient());
  });

  test("throws a descriptive error when env is missing", () => {
    vi.stubEnv(URL_VAR, "");
    vi.stubEnv(ANON_VAR, "");
    expect(() => createClient()).toThrowError(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});
