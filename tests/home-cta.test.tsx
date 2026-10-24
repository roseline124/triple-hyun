import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("home CTA", () => {
  const html = renderToStaticMarkup(<Home />);
  const link = html.match(/<a [^>]*href="\/scan"[^>]*>/)?.[0] ?? "";

  it("links to /scan with the primary rounded button style", () => {
    expect(link).not.toBe("");
    expect(link).toContain("rounded-pill");
    expect(link).toContain("bg-orange-500");
    expect(link).toContain("font-bold");
  });

  it("keeps a visible keyboard focus style", () => {
    expect(link).toContain("focus-visible:outline-3");
  });

  it("keeps the English label", () => {
    expect(html).toContain("Scan my skills");
  });
});
