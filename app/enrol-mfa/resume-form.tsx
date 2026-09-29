"use client";

import { useActionState, useState } from "react";
import { resumeEnrolment, type EnrolState } from "./actions";

const initialState: EnrolState = {};

/**
 * Completes an interrupted enrolment: one fresh code, then the server
 * redirects to the completion page (redirect-based delivery).
 */
export default function ResumeEnrolForm() {
  const [state, action, pending] = useActionState(resumeEnrolment, initialState);
  const [code, setCode] = useState("");
  return (
    <main>
      <h1>Finish setup</h1>
      <p>Your authenticator is verified. Enter one more code to finish.</p>
      <form action={action}>
        <label htmlFor="code">6-digit code</label>
        <input
          id="code"
          name="code"
          type="text"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        {state.error ? <p role="alert">{state.error}</p> : null}
        <button type="submit" disabled={pending}>
          Verify
        </button>
      </form>
    </main>
  );
}
