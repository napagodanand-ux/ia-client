import SignupForm from "./signup-form";

export default function SignupPage() {
  return (
    <main>
      <h1>Create account</h1>
      <p>Approval is manual. No portal access until your request is approved.</p>
      <SignupForm />
    </main>
  );
}
