import { describe, expect, it } from "vitest";
import type { Task } from "../types";
import { buildRail } from "./selectors";

const TODAY = "2026-06-17";
const NOW = 540;

const tasks: Task[] = [
  { id: "t1", title: "Today task", project: "Work", cat: "work", est: 30, status: "needsAction", due: "2026-06-17", completed: null, source: "gtasks" },
  { id: "t2", title: "Overdue task", project: "Work", cat: "work", est: 30, status: "needsAction", due: "2026-06-16", completed: null, source: "gtasks" },
  { id: "t3", title: "Inbox task", project: "", cat: "work", est: 30, status: "needsAction", due: null, completed: null, source: "gtasks" },
  { id: "t4", title: "Done task", project: "Work", cat: "work", est: 30, status: "completed", due: "2026-06-17", completed: "today, 8:00 AM", source: "gtasks" },
  { id: "e1", title: "Reply to Sam", project: "", cat: "email", est: 15, status: "needsAction", due: null, completed: null, source: "gmail", meta: "Sam" },
  { id: "b1", title: "Past block", project: "Eng", cat: "eng", est: 60, status: "needsAction", due: "2026-06-16", completed: null, source: "gtasks", scheduled: true, block: { date: "2026-06-16", start: 600, end: 660 } },
];

function sec(rail: ReturnType<typeof buildRail>, label: string) {
  return rail.sections.find((s) => s.label === label);
}

describe("buildRail", () => {
  it("buckets tasks into the right sections", () => {
    const rail = buildRail({ tasks, showEmail: true, now: NOW, today: TODAY });

    expect(sec(rail, "Today")?.rows.map((r) => r.id)).toEqual(["t1"]);
    expect(sec(rail, "Inbox")?.rows.map((r) => r.id)).toEqual(["t3"]);
    expect(sec(rail, "Email · needs reply")?.rows.map((r) => r.id)).toEqual(["e1"]);

    // overdue contains both the overdue task and the past time block
    const overdue = sec(rail, "Overdue")!;
    expect(overdue.rows.map((r) => r.id).sort()).toEqual(["b1", "t2"]);
    const block = overdue.rows.find((r) => r.id === "b1")!;
    expect(block.meta).toBe("Time block");

    // completed task is archived, not in active sections
    expect(rail.archived.map((r) => r.id)).toEqual(["t4"]);
  });

  it("hides the Email section when the source is off", () => {
    const rail = buildRail({ tasks, showEmail: false, now: NOW, today: TODAY });
    expect(sec(rail, "Email · needs reply")).toBeUndefined();
  });

  it("omits empty sections", () => {
    const rail = buildRail({ tasks: [], showEmail: true, now: NOW, today: TODAY });
    expect(rail.sections).toHaveLength(0);
    expect(rail.archived).toHaveLength(0);
  });
});
