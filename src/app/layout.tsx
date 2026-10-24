import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "길드 퀘스트",
  description: "직업이 사라져도 길드와 함께 전직하는 플랫폼",
};

const links = [
  { href: "/scan", label: "능력 검사" },
  { href: "/guilds", label: "길드" },
  { href: "/quests", label: "퀘스트 게시판" },
  { href: "/wallet", label: "지갑" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <header>
          <nav aria-label="주요 메뉴">
            <Link href="/">
              <strong>길드 퀘스트</strong>
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
