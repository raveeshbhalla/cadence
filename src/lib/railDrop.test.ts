import { describe, expect, it } from "vitest";
import { railDueForKey, railMoveLabel } from "./railDrop";

describe("railDueForKey", () => {
  it("maps rail sections to concrete due dates", () => {
    expect(railDueForKey("inbox", "2026-06-17")).toBeNull();
    expect(railDueForKey("today", "2026-06-17")).toBe("2026-06-17");
    expect(railDueForKey("tomorrow", "2026-06-17")).toBe("2026-06-18");
    expect(railDueForKey("thisweek", "2026-06-17")).toBe("2026-06-19");
    expect(railDueForKey("nextweek", "2026-06-17")).toBe("2026-06-22");
    expect(railDueForKey("later", "2026-06-17")).toBe("2026-06-29");
  });

  it("omits this-week drops when no post-tomorrow day remains in the week", () => {
    expect(railDueForKey("thisweek", "2026-06-20")).toBeUndefined();
  });
});

describe("railMoveLabel", () => {
  it("labels the null-date bucket as no date", () => {
    expect(railMoveLabel("inbox")).toBe("No date");
  });
});
