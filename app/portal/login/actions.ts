"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateLogin } from "@/lib/auth/validation";

export interface LoginState {
  error?: string;
}

/** Password login. Every failure returns the same generic error (no oracle). */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = validateLogin(formData.get("email"), formData.get("password"));
  if (!parsed.ok) {
    return { error: "Invalid email or password." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.value);
  if (error) {
    return { error: "Invalid email or password." };
  }
  redirect("/portal");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
