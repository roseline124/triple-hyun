import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// next/font/google needs the Next build pipeline, so stub it with the shape the layout uses.
vi.mock("next/font/google", () => ({
  Noto_Sans: () => ({ variable: "font-body-var" }),
  Noto_Sans_Display: () => ({ variable: "font-display-var" }),
}));

import RootLayout, { metadata } from "@/app/layout";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");
const hexes = (s: string) => [...new Set((s.match(/#[0-9A-Fa-f]{6}\b/g) ?? []).map((h) => h.toUpperCase()))];

describe("brand: worktree", () => {
  const html = renderToStaticMarkup(<RootLayout>content</RootLayout>);

  it("names the product worktree and keeps English as the page language", () => {
    expect(metadata.title).toBe("worktree");
    expect(html).toContain('<html lang="en"');
  });

  it("shows the logo and wordmark in the header, with the logo hidden from screen readers", () => {
    const header = html.slice(html.indexOf("<header"), html.indexOf("</header>"));
    expect(header).toContain("worktree-icon.svg");
    expect(header).toMatch(/alt=""/);
    expect(header).toContain(">worktree<");
    expect(header).not.toContain("Guild Quest");
  });

  it("uses the logo as the favicon", () => {
    expect(metadata.icons).toEqual({ icon: "/worktree-icon.svg" });
  });

  it("loads the two Noto Sans fonts on <html>", () => {
    expect(html).toContain("font-body-var");
    expect(html).toContain("font-display-var");
  });
});

describe("logo asset", () => {
  it("the app's copy is byte-identical to the design source", () => {
    expect(read("public/worktree-icon.svg")).toBe(read("docs/design/assets/worktree-icon.svg"));
  });

  it("every color in the logo exists in the design tokens", () => {
    const tokens = hexes(read("docs/design/tokens.css"));
    const logo = hexes(read("docs/design/assets/worktree-icon.svg"));
    expect(logo).toEqual(expect.arrayContaining(["#140C09", "#FFF4E8", "#E8C49A", "#FF6A2B"]));
    for (const color of logo) expect(tokens).toContain(color);
  });
});

describe("globals.css follows the design bible", () => {
  const css = read("src/app/globals.css");

  it("imports the design tokens instead of copying them", () => {
    expect(css).toMatch(/@import\s+["']\.\.\/\.\.\/docs\/design\/tokens\.css["']/);
  });

  it("has no raw hex colors (use tokens)", () => {
    expect(hexes(css)).toEqual([]);
  });

  it("never sets text color to the accent orange", () => {
    expect(css).not.toMatch(/(^|[;{\s])color:\s*var\(--(color-accent|wt-orange)/m);
  });
});
