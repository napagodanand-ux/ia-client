/**
 * Enrol-area path predicate (D-11 §1 gate).
 *
 * The enrolment flow spans /enrol-mfa (start/rounds/resume) AND
 * /enrol-mfa/complete (slow hash+store during its own server render). An
 * unenrolled staff user mid-flow must reach the completion page — gating it
 * strands them (verified native factor, no app row, no way forward).
 * The trailing-slash form keeps "/enrol-mfa-evil" outside the area.
 */
export function isEnrolPath(pathname: string): boolean {
  return pathname === "/enrol-mfa" || pathname.startsWith("/enrol-mfa/");
}
