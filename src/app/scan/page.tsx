import { ScanForm } from "./ScanForm";

export default function ScanPage() {
  return (
    <>
      <h1>Skill scan</h1>
      <p className="muted">Describe your work and AI will surface skills you didn&apos;t know you had, plus second-career options.</p>
      <ScanForm />
    </>
  );
}
