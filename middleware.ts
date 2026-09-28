import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./lib/supabase/env";
import { updateSession } from "./lib/supabase/middleware";

const PORTAL_LOGIN_PATH = "/portal/login";
const PORTAL_HOME_PATH = "/portal";
const HEALTH_PATH = "/api/health";

/**
 * Client portal gate (ia-client :3000).
 *
 * Mirrored session-refresh core from ia-staff lib/supabase/middleware
 * (copied by file, no live cross-repo imports per D-03c).
 *
 * - Public marketing (/, /api/health, /portal/login) stays open —
 *   anonymous visitors never see portal internals (spec §3).
 * - /portal and everything under it except /portal/login requires a
 *   server-validated session; without one the request redirects to
 *   /portal/login. MFA/step-up gating arrives with the D-11 migration —
 *   this gate is session presence only.
 * - Missing Supabase env fails closed to the login redirect on protected
 *   routes while public routes keep working.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === HEALTH_PATH) {
    return NextResponse.next();
  }

  const isPortalLogin = pathname === PORTAL_LOGIN_PATH;
  const isPortalArea = pathname === PORTAL_HOME_PATH || pathname.startsWith("/portal/");

  if (!isPortalArea && !isPortalLogin) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  let userId: string | null = null;

  try {
    const env = getSupabaseEnv();
    const refreshed = await updateSession(request, env);
    response = refreshed.response;
    userId = refreshed.userId;
  } catch {
    console.warn(
      "ia-client middleware: Supabase session unavailable; treating request as unauthenticated.",
    );
    userId = null;
  }

  if (isPortalLogin) {
    if (userId) {
      const portal = request.nextUrl.clone();
      portal.pathname = PORTAL_HOME_PATH;
      return NextResponse.redirect(portal);
    }
    return response;
  }

  if (!userId) {
    const login = request.nextUrl.clone();
    login.pathname = PORTAL_LOGIN_PATH;
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
