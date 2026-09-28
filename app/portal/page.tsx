import { logout } from "./login/actions";

export default function PortalPage() {
  return (
    <main>
      <h1>Portal</h1>
      <p>Your approval request is pending. No portal access until approved.</p>
      <form action={logout}>
        <button type="submit">Log out</button>
      </form>
    </main>
  );
}
