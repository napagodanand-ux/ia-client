"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AcceptState {
  error?: string;
}

/** Accept my own invitation (the RPC enforces own-row-only in-SQL). */
export async function acceptInvite(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) {
    redirect("/invites?error=invite");
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("accept_invite", {
      p_membership_id: id,
    });
    if (error) {
      redirect("/invites?error=invite");
    }
  } catch {
    redirect("/invites?error=invite");
  }
  redirect("/portal");
}
