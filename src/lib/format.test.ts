import { describe, expect, it } from "vitest";
import { createFormatters, fmtDate, fmtMs, fmtNum, fmtSecs, fmtUsd } from "./format";

describe("formatters", () => {
  it("keeps the English output of the legacy exports", () => {
    expect(fmtUsd(0.1)).toBe("$0.1000");
    expect(fmtUsd(null)).toBe("—");
    expect(fmtMs(1234.4)).toBe("1234 ms");
    expect(fmtNum(30.66)).toBe("30.7");
    expect(fmtSecs(65)).toBe("1m 5s");
    expect(fmtDate("2026-03-05T10:00:00Z")).toMatch(/Mar 2026/);
  });

  it("formats numbers, currency and dates in French", () => {
    const f = createFormatters("fr");
    expect(f.num(30.66)).toBe("30,7");
    expect(f.usd(0.1, 2)).toMatch(/^0,10\s\$US$/);
    expect(f.secs(65)).toBe("1 min 5 s");
    expect(f.date("2026-03-05T10:00:00Z")).toMatch(/mars 2026/);
  });

  it("formats Spanish month names", () => {
    expect(createFormatters("es").date("2026-03-05T10:00:00Z")).toMatch(/mar 2026/);
  });
});
