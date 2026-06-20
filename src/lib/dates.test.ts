import { describe, expect, it } from "vitest";
import { addDays, dateKey, diffDays, mondayOf, nextDow, parseKey, weekDates } from "./dates";

describe("dates", () => {
  it("dateKey / parseKey round-trip", () => {
    const d = new Date(2026, 5, 17); // Jun 17 2026
    expect(dateKey(d)).toBe("2026-06-17");
    const p = parseKey("2026-06-17");
    expect(p.getFullYear()).toBe(2026);
    expect(p.getMonth()).toBe(5);
    expect(p.getDate()).toBe(17);
  });

  it("addDays crosses month boundaries", () => {
    expect(addDays("2026-06-17", 1)).toBe("2026-06-18");
    expect(addDays("2026-06-30", 1)).toBe("2026-07-01");
    expect(addDays("2026-06-01", -1)).toBe("2026-05-31");
    expect(addDays("2026-06-17", 7)).toBe("2026-06-24");
  });

  it("diffDays is signed whole days", () => {
    expect(diffDays("2026-06-18", "2026-06-17")).toBe(1);
    expect(diffDays("2026-06-17", "2026-06-19")).toBe(-2);
    expect(diffDays("2026-06-17", "2026-06-17")).toBe(0);
    expect(diffDays("2026-07-01", "2026-06-17")).toBe(14);
  });

  it("mondayOf returns the Monday of the week", () => {
    expect(mondayOf(new Date(2026, 5, 17))).toBe("2026-06-15"); // Wed → Mon
    expect(mondayOf(new Date(2026, 5, 15))).toBe("2026-06-15"); // Mon → itself
    expect(mondayOf(new Date(2026, 5, 21))).toBe("2026-06-15"); // Sun → that Mon
  });

  it("weekDates gives Mon–Sun by default", () => {
    expect(weekDates("2026-06-15")).toEqual(["2026-06-15", "2026-06-16", "2026-06-17", "2026-06-18", "2026-06-19", "2026-06-20", "2026-06-21"]);
  });

  it("weekDates can still return a workweek", () => {
    expect(weekDates("2026-06-15", 5)).toEqual(["2026-06-15", "2026-06-16", "2026-06-17", "2026-06-18", "2026-06-19"]);
  });

  it("nextDow resolves on/after today", () => {
    // 2026-06-17 is a Wednesday (getDay 3)
    expect(nextDow("2026-06-17", 3)).toBe("2026-06-17"); // today
    expect(nextDow("2026-06-17", 4)).toBe("2026-06-18"); // Thursday
    expect(nextDow("2026-06-17", 1)).toBe("2026-06-22"); // next Monday
  });
});
