import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Email-confirmation landing (GET /auth/confirm?code=...).
 * Exchanges the one-time code for a session, then enters the portal.
 * Invalid/expired codes bounce to login with no detail leaked.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/portal/login?error=confirm", url));
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/portal/login?error=confirm", url));
  }
  return NextResponse.redirect(new URL("/portal", url));
}
