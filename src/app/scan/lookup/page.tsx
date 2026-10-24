import { LookupForm } from "./LookupForm";

export default function LookupPage() {
  return (
    <>
      <h1>Look up your results</h1>
      <p className="max-w-prose text-muted">Enter the nickname and 4-digit PIN you used for your scan.</p>
      <LookupForm />
    </>
  );
}
