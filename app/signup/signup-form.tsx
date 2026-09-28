"use client";

import { useActionState, useState } from "react";
import { signup, type SignupState } from "./actions";

const initialState: SignupState = {};

/**
 * Controlled inputs: React clears uncontrolled fields when a form action
 * resolves; state-held values survive so applicants can fix one field and
 * re-submit without retyping everything.
 */
export default function SignupForm() {
  const [state, action, pending] = useActionState(signup, initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [businessNeed, setBusinessNeed] = useState("");
  return (
    <form action={action}>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label htmlFor="password">Password (12+ characters)</label>
      <input
        id="password"
        name="password"
        type="password"
        required
        minLength={12}
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <label htmlFor="orgName">Organisation name</label>
      <input
        id="orgName"
        name="orgName"
        type="text"
        required
        autoComplete="organization"
        value={orgName}
        onChange={(e) => setOrgName(e.target.value)}
      />
      <label htmlFor="businessNeed">Business need</label>
      <textarea
        id="businessNeed"
        name="businessNeed"
        required
        minLength={10}
        value={businessNeed}
        onChange={(e) => setBusinessNeed(e.target.value)}
      />
      {state.error ? <p role="alert">{state.error}</p> : null}
      <button type="submit" disabled={pending}>
        Create account
      </button>
    </form>
  );
}
