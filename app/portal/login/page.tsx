import GoogleButton from "./google-button";
import LoginForm from "./login-form";

export default async function ClientLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main>
      <h1>Client Login</h1>
      {params.created === "1" ? <p>Account created. Check your email to continue.</p> : null}
      {params.error === "confirm" ? (
        <p role="alert">The confirmation link was invalid or expired.</p>
      ) : null}
      {params.error === "oauth" ? (
        <p role="alert">Sign-in with Google is unavailable right now.</p>
      ) : null}
      <LoginForm />
      <GoogleButton label="Continue with Google" />
    </main>
  );
}
