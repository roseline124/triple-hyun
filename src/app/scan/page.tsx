import { ScanForm } from "./ScanForm";

export default function ScanPage() {
  return (
    <>
      <h1>Find what you&apos;re good at, including what you haven&apos;t noticed</h1>
      <p className="max-w-prose text-muted">
        Paste your résumé or LinkedIn text, answer a few quick questions, and see the skills your work shows, second-career
        options, and the guilds and quests that fit.
      </p>
      <ScanForm />
    </>
  );
}
