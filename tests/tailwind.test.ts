import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compile } from "tailwindcss";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const theme = read("docs/design/tailwind-theme.css");
const tokens = read("docs/design/tokens.css");

const hexes = (s: string) => [...new Set((s.match(/#[0-9A-Fa-f]{6}\b/g) ?? []).map((h) => h.toUpperCase()))];
const declared = (s: string, name: string) => s.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();

describe("Tailwind setup", () => {
  it("runs through PostCSS with the Tailwind v4 plugin", () => {
    expect(read("postcss.config.mjs")).toContain("@tailwindcss/postcss");
  });

  it("globals.css pulls in Tailwind, the design theme, and the tokens, and scans only src", () => {
    const css = read("src/app/globals.css");
    expect(css).toMatch(/@import\s+["']tailwindcss["']\s+source\(["']\.\.\/["']\)/);
    expect(css).toMatch(/@import\s+["']\.\.\/\.\.\/docs\/design\/tailwind-theme\.css["']/);
    expect(css).toMatch(/@import\s+["']\.\.\/\.\.\/docs\/design\/tokens\.css["']/);
  });

  it("keeps our element styles in a cascade layer so utility classes can override them", () => {
    const css = read("src/app/globals.css");
    expect(css).toMatch(/@layer base\s*\{/);
    expect(css).toMatch(/@layer components\s*\{/);
  });

  it("lists tailwindcss and its PostCSS plugin as dev dependencies", () => {
    const pkg = JSON.parse(read("package.json")) as { devDependencies: Record<string, string> };
    expect(pkg.devDependencies).toHaveProperty("tailwindcss");
    expect(pkg.devDependencies).toHaveProperty("@tailwindcss/postcss");
  });
});

describe("tailwind-theme.css stays in sync with tokens.css", () => {
  it("every color in the Tailwind theme exists in the tokens", () => {
    const tokenHexes = hexes(tokens);
    for (const hex of hexes(theme)) expect(tokenHexes, `missing in tokens.css: ${hex}`).toContain(hex);
  });

  it("every color in the tokens' palette exists in the Tailwind theme", () => {
    const themeHexes = hexes(theme);
    for (const hex of hexes(tokens)) expect(themeHexes, `missing in tailwind-theme.css: ${hex}`).toContain(hex);
  });

  it.each(["radius-input", "radius-tile", "radius-hero", "radius-arch", "radius-pill", "radius-leaf", "text-display", "text-h1", "text-h2", "text-h3", "text-body", "text-small", "text-caption", "tracking-display"])(
    "--%s has the same value in both files",
    (name) => {
      expect(declared(theme, name), `${name} is missing in tailwind-theme.css`).toBeDefined();
      expect(declared(theme, name)).toBe(declared(tokens, name));
    },
  );
});

describe("Tailwind output with the design theme", () => {
  const build = async (candidates: string[]) => {
    const compiler = await compile(`@tailwind utilities;\n${theme}`);
    return compiler.build(candidates);
  };

  it("generates the brand utilities", async () => {
    const css = await build(["bg-brown-950", "text-cream-100", "bg-orange-500", "rounded-leaf", "rounded-tile", "font-display"]);
    for (const cls of ["bg-brown-950", "text-cream-100", "bg-orange-500", "rounded-leaf", "rounded-tile", "font-display"]) {
      expect(css).toContain(`.${cls}`);
    }
    expect(css).toContain("--color-brown-950: #140C09");
  });

  it("does not generate off-brand utilities such as bg-blue-500 or rounded-lg", async () => {
    const css = await build(["bg-blue-500", "text-red-500", "rounded-lg", "bg-pine"]);
    for (const cls of ["bg-blue-500", "text-red-500", "rounded-lg", "bg-pine"]) {
      expect(css).not.toContain(`.${cls}`);
    }
  });
});
