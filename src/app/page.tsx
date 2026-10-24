import Link from "next/link";

export default function Home() {
  return (
    <>
      <h1>When AI changes your job, switch careers with a guild</h1>
      <p className="muted">Uncover your hidden skills, join a guild, and earn from quests.</p>
      <p>
        <Link href="/scan">Scan my skills →</Link>
      </p>
    </>
  );
}
