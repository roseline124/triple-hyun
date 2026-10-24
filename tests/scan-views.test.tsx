import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LookupForm } from "@/app/scan/lookup/LookupForm";
import { CredentialFields } from "@/app/scan/CredentialFields";
import { Recommendations, ScanResultView } from "@/app/scan/ResultView";
import { ScanForm } from "@/app/scan/ScanForm";
import { ErrorTile, LoadingTile } from "@/app/scan/ui";
import { seedGuilds, seedQuests } from "@/lib/seed";
import type { ScanResult } from "@/lib/types";

const result: ScanResult = {
  archetype: "Documentation Alchemist",
  summary: "Your writing shows strong review skills.",
  skills: [
    { name: "Technical writing", score: 90, evidence: "I rewrote our API docs", source: "resume" },
    { name: "Mentoring", score: 72, evidence: "I coach new hires every month", source: "answer" },
    { name: "Process design", score: 60, evidence: "I wrote the intake checklist", source: "answer" },
  ],
  secondJobs: [
    { title: "AI content reviewer", reason: "Writing experience" },
    { title: "Developer advocate", reason: "Enablement" },
  ],
  tags: ["Technical writing", "Developer content"],
};
const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe("ScanResultView", () => {
  const out = html(<ScanResultView result={result} />);

  it("shows the archetype, summary and tags", () => {
    expect(out).toContain("Documentation Alchemist");
    expect(out).toContain("Your writing shows strong review skills.");
    expect(out).toContain('aria-label="Your tags"');
    expect(out).toContain("Developer content");
  });

  it("shows every skill with its score as text and an accessible bar, plus the quoted evidence and its source", () => {
    expect(out).toContain("90/100");
    expect(out).toContain('aria-label="Technical writing: 90 out of 100"');
    expect(out).toContain("<q>I rewrote our API docs</q>");
    expect(out).toContain("From your résumé");
    expect(out).toContain("From your answers");
    expect(out).toContain("width:72%");
  });

  it("lists second-career options and always shows the limitation notice", () => {
    expect(out).toContain("AI content reviewer");
    expect(out).toContain("Writing experience");
    expect(out).toContain("AI estimate based only on what you shared. Not a verified assessment; scores are relative.");
  });

  it("shows a loading state for guild and quest matches while they load", () => {
    expect(out).toContain('role="status"');
    expect(out).toContain("Finding guilds and quests that fit…");
  });
});

describe("Recommendations", () => {
  it("shows matching guilds and open quests with the tags that matched and links to their pages", () => {
    const out = html(<Recommendations tags={["Technical writing"]} guilds={seedGuilds()} quests={seedQuests()} />);
    expect(out).toContain('href="/guilds/g-1"');
    expect(out).toContain("Docs Alchemists");
    expect(out).toContain("Matches: Technical writing");
    expect(out).toContain('href="/quests/q-1"');
    expect(out).not.toContain("Austin Test Guardians");
    expect(out).not.toContain('href="/quests/q-2"');
  });

  it("shows empty states with a way forward when nothing matches", () => {
    const out = html(<Recommendations tags={["Unrelated tag"]} guilds={seedGuilds()} quests={seedQuests()} />);
    expect(out).toContain("No matching guilds yet.");
    expect(out).toContain('href="/guilds"');
    expect(out).toContain("No open quests match yet.");
    expect(out).toContain('href="/quests"');
  });

  it("shows a revenue-share quest without a made-up price", () => {
    const out = html(<Recommendations tags={["Open source"]} guilds={[]} quests={seedQuests()} />);
    expect(out).toContain("Revenue share");
    expect(out).not.toContain("$0");
  });
});

describe("status tiles", () => {
  it("ErrorTile is an alert with a title and body, and renders actions", () => {
    const out = html(
      <ErrorTile title="Couldn't load" actions={<button>Try again</button>}>
        Check your connection.
      </ErrorTile>,
    );
    expect(out).toContain('role="alert"');
    expect(out).toContain("Couldn&#x27;t load");
    expect(out).toContain("Check your connection.");
    expect(out).toContain("Try again");
  });

  it("LoadingTile is a busy status with a label, and only has Cancel when it can be cancelled", () => {
    const plain = html(<LoadingTile label="Reading your background…" />);
    expect(plain).toContain('role="status"');
    expect(plain).toContain('aria-busy="true"');
    expect(plain).toContain("Reading your background…");
    expect(plain).not.toContain("Cancel");
    expect(html(<LoadingTile label="x" onCancel={() => {}} />)).toContain("Cancel");
  });
});

describe("CredentialFields", () => {
  const out = html(<CredentialFields nickname="" pin="" onNickname={() => {}} onPin={() => {}} />);

  it("labels both fields and masks the PIN with a numeric keypad and a 4-digit pattern", () => {
    expect(out).toContain('for="nickname"');
    expect(out).toContain('for="pin"');
    expect(out).toMatch(/<input[^>]*id="pin"[^>]*type="password"/);
    expect(out).toContain('inputMode="numeric"');
    expect(out).toContain('pattern="[0-9]{4}"');
    expect(out).toContain('maxLength="4"');
  });

  it("explains that both are needed later and that a PIN can't be recovered", () => {
    expect(out).toContain("You&#x27;ll need both to view your results later.");
    expect(out).toContain("can&#x27;t be recovered");
    expect(out).toContain('aria-describedby="pin-help"');
  });
});

describe("ScanForm (initial step)", () => {
  const out = html(<ScanForm />);

  it("shows the demo storage notice, the fields, and a lookup link", () => {
    expect(out).toContain("Demo only. We store what you paste under your nickname and PIN.");
    expect(out).toContain("replaces that profile");
    expect(out).toContain("Résumé or LinkedIn text");
    expect(out).toContain("Interests (optional)");
    expect(out).toContain('href="/scan/lookup"');
  });

  it("enforces the length limits natively and starts with a Continue button and no error", () => {
    expect(out).toContain('minLength="20"');
    expect(out).toContain('maxLength="6000"');
    expect(out).toContain("0 / 6,000");
    expect(out).toContain(">Continue<");
    expect(out).not.toContain('role="alert"');
  });
});

describe("LookupForm (initial state)", () => {
  it("asks for the nickname and PIN with a clear action and shows no results or errors yet", () => {
    const out = html(<LookupForm />);
    expect(out).toContain("Look up my results");
    expect(out).not.toContain('role="alert"');
    expect(out).not.toContain("Results for");
  });
});
