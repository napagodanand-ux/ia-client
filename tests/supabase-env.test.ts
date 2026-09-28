import { afterEach, describe, expect, test, vi } from "vitest";
import { getSupabaseEnv } from "../lib/supabase/env";

const URL_VAR = "NEXT_PUBLIC_SUPABASE_URL";
const ANON_VAR = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

const VALID_URL = "https://example.supabase.co";
const VALID_KEY = "test-anon-key";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSupabaseEnv", () => {
  test("returns url and anon key when both are set and valid", () => {
    vi.stubEnv(URL_VAR, VALID_URL);
    vi.stubEnv(ANON_VAR, VALID_KEY);
    expect(getSupabaseEnv()).toEqual({ url: VALID_URL, anonKey: VALID_KEY });
  });

  test("throws when the URL is missing", () => {
    vi.stubEnv(URL_VAR, "");
    vi.stubEnv(ANON_VAR, VALID_KEY);
    expect(() => getSupabaseEnv()).toThrowError(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  test("throws when the anon key is missing", () => {
    vi.stubEnv(URL_VAR, VALID_URL);
    vi.stubEnv(ANON_VAR, "");
    expect(() => getSupabaseEnv()).toThrowError(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  test("throws when the URL is not parseable", () => {
    vi.stubEnv(URL_VAR, "not-a-url");
    vi.stubEnv(ANON_VAR, VALID_KEY);
    expect(() => getSupabaseEnv()).toThrowError(/parseable/);
  });

  test("throws when the URL is not https", () => {
    vi.stubEnv(URL_VAR, "http://example.supabase.co");
    vi.stubEnv(ANON_VAR, VALID_KEY);
    expect(() => getSupabaseEnv()).toThrowError(/https/);
  });
});
