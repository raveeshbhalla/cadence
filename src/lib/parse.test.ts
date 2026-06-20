import { describe, expect, it } from "vitest";
import { parseCapture, parseWhen } from "./parse";

const TODAY = "2026-06-17"; // Wednesday

describe("parseWhen (triage)", () => {
  const NINE_AM = 9 * 60;
  it("explicit pm time defaults to 30 min", () => {
    expect(parseWhen("8pm", NINE_AM, TODAY)).toEqual({ date: TODAY, start: 20 * 60, dur: 30 });
  });
  it("range → start + duration", () => {
    expect(parseWhen("8-9pm", NINE_AM, TODAY)).toEqual({ date: TODAY, start: 20 * 60, dur: 60 });
  });
  it("time + duration (both phrasings)", () => {
    expect(parseWhen("8pm 90m", NINE_AM, TODAY)).toEqual({ date: TODAY, start: 20 * 60, dur: 90 });
    expect(parseWhen("8pm, 90 mins", NINE_AM, TODAY)).toEqual({ date: TODAY, start: 20 * 60, dur: 90 });
  });
  it("bare hour → next occurrence of that o'clock", () => {
    expect(parseWhen("8", NINE_AM, TODAY)).toEqual({ date: TODAY, start: 20 * 60, dur: 30 }); // 8am passed → 8pm
    expect(parseWhen("8", 7 * 60, TODAY)).toEqual({ date: TODAY, start: 8 * 60, dur: 30 }); // before 8am → 8am
  });
  it("resolves relative dates", () => {
    expect(parseWhen("tomorrow 8pm", NINE_AM, TODAY)).toEqual({ date: "2026-06-18", start: 20 * 60, dur: 30 });
    expect(parseWhen("tomorrow 2", NINE_AM, TODAY)).toEqual({ date: "2026-06-18", start: 14 * 60, dur: 30 });
    expect(parseWhen("next week 2pm", NINE_AM, TODAY)).toEqual({ date: "2026-06-22", start: 14 * 60, dur: 30 });
    expect(parseWhen("next week thursday 10-11am", NINE_AM, TODAY)).toEqual({ date: "2026-06-25", start: 10 * 60, dur: 60 });
    expect(parseWhen("friday 8-9pm", NINE_AM, TODAY)).toEqual({ date: "2026-06-19", start: 20 * 60, dur: 60 });
  });
  it("no time → null", () => {
    expect(parseWhen("lunch", NINE_AM, TODAY)).toBeNull();
  });
});

describe("parseCapture", () => {
  it("extracts title, weekday, time, duration, list", () => {
    const p = parseCapture("Draft Q3 deck thursday 2pm ~90m #work", TODAY);
    expect(p.title).toBe("Draft Q3 deck");
    expect(p.date).toBe("2026-06-18"); // upcoming Thursday
    expect(p.dayLabel).toBe("Thu");
    expect(p.time).toBe(14 * 60);
    expect(p.est).toBe(90);
    expect(p.project).toBe("work");
    expect(p.cat).toBe("work");
  });

  it("handles today / tomorrow", () => {
    expect(parseCapture("Pay invoices today", TODAY).date).toBe("2026-06-17");
    expect(parseCapture("Gym tomorrow", TODAY).date).toBe("2026-06-18");
  });

  it("hours and 'at' times", () => {
    expect(parseCapture("Sync 1h", TODAY).est).toBe(60);
    expect(parseCapture("Call at 3", TODAY).time).toBe(15 * 60);
  });

  it("parses time ranges into start + duration", () => {
    const a = parseCapture("Spin class 7:45am-9am tomorrow", TODAY);
    expect(a.title).toBe("Spin class");
    expect(a.time).toBe(7 * 60 + 45);
    expect(a.est).toBe(75);
    expect(a.date).toBe("2026-06-18");

    const b = parseCapture("Lunch 12-1pm", TODAY);
    expect(b.time).toBe(12 * 60);
    expect(b.est).toBe(60);

    const c = parseCapture("Review 2-3:30pm", TODAY);
    expect(c.time).toBe(14 * 60);
    expect(c.est).toBe(90);

    const d = parseCapture("Wei and Bo's tomorrow 11-4pm", TODAY);
    expect(d.title).toBe("Wei and Bo's");
    expect(d.date).toBe("2026-06-18");
    expect(d.time).toBe(11 * 60);
    expect(d.est).toBe(5 * 60);
  });

  it("does not treat a bare number range as a time", () => {
    const p = parseCapture("Buy 2-3 apples", TODAY);
    expect(p.time).toBeNull();
    expect(p.title).toBe("Buy 2-3 apples");
  });

  it("recognises and strips a [ ] checkbox marker", () => {
    const p = parseCapture("[ ] Prep deck", TODAY);
    expect(p.checkbox).toBe(true);
    expect(p.title).toBe("Prep deck");
    expect(parseCapture("Standup", TODAY).checkbox).toBe(false);
  });

  it("no date → inbox (null date)", () => {
    const p = parseCapture("Email Bob back", TODAY);
    expect(p.title).toBe("Email Bob back");
    expect(p.date).toBeNull();
    expect(p.time).toBeNull();
  });

  it("capitalises the title and strips connector words", () => {
    expect(parseCapture("call dana friday", TODAY).title).toBe("Call dana");
  });
});
