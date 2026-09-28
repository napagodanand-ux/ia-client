import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseEnv } from "./env";

export interface SessionRefresh {
  response: NextResponse;
  userId: string | null;
}

/**
 * Refresh the Supabase session cookie and report the authenticated user.
 *
 * Calls getUser() (server-validated) so expired access tokens rotate via the
 * refresh token before any page or API route runs. Cookie writes propagate
 * through the returned response — callers must return it.
 */
export async function updateSession(
  request: NextRequest,
  env: SupabaseEnv,
): Promise<SessionRefresh> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, userId: user?.id ?? null };
}
