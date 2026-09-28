import { createAdminClient } from "@/lib/supabase/admin";

/** Roles that must complete app-MFA before privileged routes unlock (D-11 §1). */
export const STAFF_ROLES = [
  "owner",
  "co_founder",
  "super_admin",
  "admin",
  "team_lead",
  "member",
] as const;

/**
 * Whether the user holds any ACTIVE staff role in any org. Client-only users
 * (client_owner/client_member) and pending/invited rows do not count.
 * Service_role read; safe to call from middleware (edge) and server paths.
 */
export async function hasStaffRole(userId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("org_memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .in("role", [...STAFF_ROLES])
      .limit(1);
    if (error || !data) {
      return false;
    }
    return data.length > 0;
  } catch {
    // Fail closed: without role evidence the gate treats the user as gated.
    return true;
  }
}

/**
 * Whether the user completed app-MFA enrolment (D-11 §1 gate state).
 * Missing row or NULL enrolled_at = restricted session.
 */
export async function isMfaEnrolled(userId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("mfa_enrolments")
      .select("enrolled_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) {
      return false;
    }
    return data.enrolled_at !== null;
  } catch {
    return false;
  }
}
