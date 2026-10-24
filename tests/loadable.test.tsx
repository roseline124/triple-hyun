import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Loadable } from "@/components/Loadable";
import type { AsyncState } from "@/lib/useAsync";

const render = (state: AsyncState<string[]>) =>
  renderToStaticMarkup(
    <Loadable state={state} isEmpty={(d) => d.length === 0} empty="Nothing here">
      {(d) => <ul>{d.map((x) => <li key={x}>{x}</li>)}</ul>}
    </Loadable>,
  );

describe("Loadable", () => {
  it("shows loading", () => expect(render({ status: "loading" })).toContain("Loading"));
  it("shows an alert on error", () => {
    const html = render({ status: "error" });
    expect(html).toContain('role="alert"');
  });
  it("shows the empty message", () =>
    expect(render({ status: "success", data: [] })).toContain("Nothing here"));
  it("renders children on success", () =>
    expect(render({ status: "success", data: ["a", "b"] })).toContain("<li>b</li>"));
});
