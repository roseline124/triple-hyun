import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guild Quest",
  description: "Find your next role with a guild when AI reshapes your job.",
};

const links = [
  { href: "/scan", label: "Skill scan" },
  { href: "/guilds", label: "Guilds" },
  { href: "/quests", label: "Quest board" },
  { href: "/wallet", label: "Wallet" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <nav aria-label="Main">
            <Link href="/">
              <strong>Guild Quest</strong>
            </Link>
            {links.map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
