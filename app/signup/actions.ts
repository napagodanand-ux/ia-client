"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateSignup } from "@/lib/auth/validation";

export interface SignupState {
  error?: string;
}

/**
 * Signup collects NO role. Creates the Auth user, then files the approval
 * request (anon-insert RLS policy). All failures return one generic message —
 * never reveal whether the email is registered or a request is pending.
 */
export async function signup(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = validateSignup({
    email: formData.get("email"),
    password: formData.get("password"),
    orgName: formData.get("orgName"),
    businessNeed: formData.get("businessNeed"),
  });
  if (!parsed.ok) {
    return { error: "Could not create the account. Check the details." };
  }
  const supabase = await createClient();
  const { error: signUpError } = await supabase.auth.signUp({
    email: parsed.value.email,
    password: parsed.value.password,
  });
  if (signUpError) {
    return { error: "Could not create the account. Check the details." };
  }
  const { error: requestError } = await supabase.from("account_requests").insert({
    email: parsed.value.email,
    org_name: parsed.value.orgName,
    business_need: parsed.value.businessNeed,
  });
  if (requestError) {
    // Duplicate pending request (23505) and RLS denial surface identically:
    // the applicant learns nothing about existing rows.
    return { error: "Could not create the account. Check the details." };
  }
  redirect("/portal/login?created=1");
}
