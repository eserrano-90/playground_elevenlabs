import { describe, expect, it } from "vitest";
import { parseRich } from "./rich";

describe("parseRich", () => {
  it("parses bold, em and code spans", () => {
    expect(parseRich("A **b** c *d* `e`.")).toEqual([
      { type: "text", text: "A " },
      { type: "strong", text: "b" },
      { type: "text", text: " c " },
      { type: "em", text: "d" },
      { type: "text", text: " " },
      { type: "code", text: "e" },
      { type: "text", text: "." },
    ]);
  });

  it("leaves plain text and unmatched marks alone", () => {
    expect(parseRich("plain")).toEqual([{ type: "text", text: "plain" }]);
    expect(parseRich("2 * 3 = 6")).toEqual([{ type: "text", text: "2 * 3 = 6" }]);
    expect(parseRich("<b>x</b>")).toEqual([{ type: "text", text: "<b>x</b>" }]);
  });
});
