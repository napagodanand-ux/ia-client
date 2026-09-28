import { createClient } from "@/lib/supabase/server";
import { acceptInvite } from "./actions";

interface Invite {
  id: string;
  role: string;
  org_name: string;
}

async function getMyInvites(): Promise<Invite[] | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }
    const { data, error } = await supabase
      .from("org_memberships")
      .select("id, role, organisations!inner(name)")
      .eq("user_id", user.id)
      .eq("status", "invited");
    if (error || !data) {
      return null;
    }
    return (
      data as Array<{
        id: string;
        role: string;
        organisations: { name: string } | Array<{ name: string }>;
      }>
    ).flatMap((r) => {
      const org = Array.isArray(r.organisations) ? r.organisations[0] : r.organisations;
      return org ? [{ id: r.id, role: r.role, org_name: org.name }] : [];
    });
  } catch {
    return null;
  }
}

export default async function InvitesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const invites = await getMyInvites();
  if (invites === null) {
    return (
      <main>
        <h1>Invites</h1>
        <p>Sign in to see your invites.</p>
      </main>
    );
  }
  return (
    <main>
      <h1>Invites</h1>
      {params.error ? <p role="alert">Could not accept the invite.</p> : null}
      {invites.length === 0 ? (
        <p>No pending invites.</p>
      ) : (
        <ul>
          {invites.map((r) => (
            <li key={r.id}>
              {r.org_name} — {r.role}
              <form action={acceptInvite}>
                <input type="hidden" name="id" value={r.id} />
                <button type="submit">Accept</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
