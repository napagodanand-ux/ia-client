import { signInWithGoogle } from "./oauth-actions";

export default function GoogleButton({ label }: { label: string }) {
  return (
    <form action={signInWithGoogle}>
      <button type="submit">{label}</button>
    </form>
  );
}
