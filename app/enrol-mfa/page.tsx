import EnrolMfa from "./enrol-form";
import ResumeEnrolForm from "./resume-form";
import { enrolmentPageState } from "./actions";

export default async function EnrolMfaPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; factor?: string }>;
}) {
  const state = await enrolmentPageState();
  if (state === "done") {
    return (
      <main>
        <h1>Set up authenticator</h1>
        <p>
          An authenticator is already set up on this account. To set up a new one, ask an Owner or
          Co-Founder for an MFA reset first.
        </p>
      </main>
    );
  }
  if (state === "resume") {
    return <ResumeEnrolForm />;
  }
  const params = await searchParams;
  const round2 =
    params.step === "2" && typeof params.factor === "string" && params.factor.length > 0
      ? params.factor
      : null;
  return <EnrolMfa round2FactorId={round2} />;
}
