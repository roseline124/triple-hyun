import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_Display } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

const body = Noto_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body-loaded", display: "swap" });
const display = Noto_Sans_Display({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-display-loaded", display: "swap" });

export const metadata: Metadata = {
  title: "worktree",
  description: "Find your next role with a guild when AI reshapes your job.",
  icons: { icon: "/worktree-icon.svg" },
};

const links = [
  { href: "/scan", label: "Skill scan" },
  { href: "/guilds", label: "Guilds" },
  { href: "/quests", label: "Quest board" },
  { href: "/wallet", label: "Wallet" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body>
        <header>
          <nav aria-label="Main">
            <Link href="/" className="brand">
              <Image src="/worktree-icon.svg" alt="" width={32} height={32} priority />
              <span>worktree</span>
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
