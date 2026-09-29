import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./lib/supabase/env";
import { updateSession } from "./lib/supabase/middleware";
import { hasStaffRole, isMfaEnrolled } from "./lib/auth/staff-role";
import { isEnrolPath } from "./lib/auth/enrol-path";

const PORTAL_LOGIN_PATH = "/portal/login";
const PORTAL_HOME_PATH = "/portal";
const ENROL_PATH = "/enrol-mfa";
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
 *   /portal/login. /enrol-mfa requires a session and is excluded from the
 *   enrolment bounce below.
 * - D-11 §1: staff-role holders without completed app-MFA are restricted to
 *   /enrol-mfa. Client-only roles pass through unaffected.
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
  // The whole enrol subtree (rounds, resume, completion) requires a session
  // but skips the staff-role gate — an unenrolled user mid-flow must reach
  // the completion page. Unauthenticated enrol URLs still route to login.
  const isEnrol = isEnrolPath(pathname);

  if (!isPortalArea && !isPortalLogin && !isEnrol) {
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

  // D-11 §1: staff-role holders without completed app-MFA are restricted to
  // /enrol-mfa (+ logout). Client-only roles pass through unaffected.
  if (isPortalArea && !isEnrol) {
    const staff = await hasStaffRole(userId);
    if (staff) {
      const enrolled = await isMfaEnrolled(userId);
      if (!enrolled) {
        const enrol = request.nextUrl.clone();
        enrol.pathname = ENROL_PATH;
        return NextResponse.redirect(enrol);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
