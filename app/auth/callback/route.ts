import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback (GET /auth/callback?code=...). Supabase redirects here after
 * the provider (Google) authenticates. Exchanges the code for a session.
 * Failures bounce to login with a generic flag (no provider detail leaked).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/portal/login?error=oauth", url));
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/portal/login?error=oauth", url));
  }
  return NextResponse.redirect(new URL("/portal", url));
}
