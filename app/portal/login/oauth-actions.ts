"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * Start Google OAuth. The provider itself is configured in the Supabase
 * dashboard (Owner, secrets via Netlify env UI — never in repo). If the
 * provider is disabled, Supabase errors and the user sees one generic message.
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) {
    redirect("/portal/login?error=oauth");
  }
  redirect(data.url);
}
