import { describe, expect, it } from "vitest";
import { pack } from "./pack";

describe("pack", () => {
  it("places non-overlapping items in a single column", () => {
    const res = pack([
      { id: "a", start: 0, end: 60 },
      { id: "b", start: 120, end: 180 },
    ]);
    expect(res.a).toEqual({ col: 0, cols: 1 });
    expect(res.b).toEqual({ col: 0, cols: 1 });
  });

  it("splits overlapping items into side-by-side columns", () => {
    const res = pack([
      { id: "a", start: 0, end: 60 },
      { id: "b", start: 30, end: 90 },
    ]);
    expect(res.a.col).toBe(0);
    expect(res.b.col).toBe(1);
    expect(res.a.cols).toBe(2);
    expect(res.b.cols).toBe(2);
  });

  it("reuses a column once an item ends", () => {
    // a & b overlap (2 cols); c starts after both → its own cluster, 1 col
    const res = pack([
      { id: "a", start: 0, end: 60 },
      { id: "b", start: 30, end: 90 },
      { id: "c", start: 120, end: 150 },
    ]);
    expect(res.a.cols).toBe(2);
    expect(res.b.cols).toBe(2);
    expect(res.c).toEqual({ col: 0, cols: 1 });
  });
});
