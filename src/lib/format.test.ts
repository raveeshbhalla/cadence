import { describe, expect, it } from "vitest";
import { bucketKey, catFromProject, chipLabelFor, fmtDur, fmtTime, isPast, isPastEvent, overdueLabel } from "./format";

describe("fmtTime", () => {
  it("formats 12-hour clock", () => {
    expect(fmtTime(0)).toBe("12 AM");
    expect(fmtTime(9 * 60 + 10)).toBe("9:10 AM");
    expect(fmtTime(12 * 60)).toBe("12 PM");
    expect(fmtTime(14 * 60)).toBe("2 PM");
    expect(fmtTime(13 * 60 + 5)).toBe("1:05 PM");
    expect(fmtTime(24 * 60)).toBe("12 AM");
  });
});

describe("fmtDur", () => {
  it("formats durations", () => {
    expect(fmtDur(0)).toBe("0m");
    expect(fmtDur(15)).toBe("15m");
    expect(fmtDur(60)).toBe("1h");
    expect(fmtDur(90)).toBe("1h 30m");
    expect(fmtDur(125)).toBe("2h 5m");
  });
});

describe("catFromProject", () => {
  it("maps list names to categories", () => {
    expect(catFromProject("Engineering")).toBe("eng");
    expect(catFromProject("Design")).toBe("design");
    expect(catFromProject("Sales")).toBe("sales");
    expect(catFromProject("Personal")).toBe("personal");
    expect(catFromProject("Anything else")).toBe("work");
  });
});

describe("bucketKey", () => {
  const today = "2026-06-17"; // Wednesday
  it("buckets by due date relative to today", () => {
    expect(bucketKey(null, today)).toBe("inbox");
    expect(bucketKey("2026-06-16", today)).toBe("overdue");
    expect(bucketKey("2026-06-17", today)).toBe("today");
    expect(bucketKey("2026-06-18", today)).toBe("tomorrow");
    expect(bucketKey("2026-06-19", today)).toBe("thisweek"); // Fri, same week
    expect(bucketKey("2026-06-22", today)).toBe("nextweek"); // next Mon
    expect(bucketKey("2026-07-01", today)).toBe("later");
  });
});

describe("chipLabelFor", () => {
  it("labels future buckets", () => {
    expect(chipLabelFor("tomorrow", "2026-06-18")).toBe("Tomorrow");
    expect(chipLabelFor("thisweek", "2026-06-19")).toBe("Fri");
    expect(chipLabelFor("nextweek", "2026-06-22")).toBe("Mon 22");
    expect(chipLabelFor("later", "2026-07-01")).toBe("Jul 1");
  });
});

describe("overdueLabel", () => {
  it("pluralises", () => {
    expect(overdueLabel(0)).toBe("earlier today");
    expect(overdueLabel(1)).toBe("1 day overdue");
    expect(overdueLabel(3)).toBe("3 days overdue");
  });
});

describe("isPast / isPastEvent", () => {
  const today = "2026-06-17";
  const now = 540; // 9:00
  it("detects past slots", () => {
    expect(isPast("2026-06-16", 600, today, now)).toBe(true); // earlier day
    expect(isPast("2026-06-17", 500, today, now)).toBe(true); // earlier today
    expect(isPast("2026-06-17", 600, today, now)).toBe(false); // later today
    expect(isPast("2026-06-18", 0, today, now)).toBe(false); // future day
  });
  it("uses end time for events", () => {
    expect(isPastEvent("2026-06-17", 540, today, now)).toBe(true); // ends exactly now
    expect(isPastEvent("2026-06-17", 600, today, now)).toBe(false); // ends later
  });
});
