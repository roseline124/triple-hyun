import Link from "next/link";

export default function Home() {
  return (
    <>
      <h1>When AI changes your job, switch careers with a guild</h1>
      <p className="muted">Uncover your hidden skills, join a guild, and earn from quests.</p>
      <p>
        <Link
          href="/scan"
          className="inline-block rounded-pill bg-orange-500 px-6 py-3 font-bold text-brown-950 hover:bg-orange-400 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brown-950"
        >
          Scan my skills →
        </Link>
      </p>
    </>
  );
}
