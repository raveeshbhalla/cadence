import type { AllDayEvent, CalEvent, Task } from "../types";
import { addDays, weekDates } from "../lib/dates";

export interface SeedData {
  events: CalEvent[];
  allDayEvents: AllDayEvent[];
  tasks: Task[];
}

/**
 * Demo data anchored to real dates. Meetings + scheduled blocks land in the
 * given week; loose tasks are bucketed relative to `today`. Replaced by live
 * Google data once signed in.
 */
export function makeSeed(weekMonday: string, today: string): SeedData {
  const w = weekDates(weekMonday); // [Mon, Tue, Wed, Thu, Fri]
  const due = (offset: number) => addDays(today, offset);

  const events: CalEvent[] = [
    { id: "m1", date: w[0], start: 600, end: 630, title: "Design sync", cat: "design" },
    { id: "m2", date: w[0], start: 840, end: 870, title: "1:1 Priya", cat: "work" },
    { id: "m3", date: w[1], start: 660, end: 720, title: "Sprint planning", cat: "eng" },
    { id: "m4", date: w[1], start: 750, end: 810, title: "Lunch", cat: "personal" },
    { id: "m5", date: w[2], start: 570, end: 585, title: "Standup", cat: "eng" },
    { id: "m6", date: w[2], start: 660, end: 720, title: "Product review", cat: "work" },
    { id: "m7", date: w[2], start: 780, end: 840, title: "Lunch w/ Sam", cat: "personal" },
    { id: "m8", date: w[2], start: 960, end: 990, title: "Customer call", cat: "sales" },
    { id: "m9", date: w[3], start: 600, end: 630, title: "1:1 Manager", cat: "work" },
    { id: "m10", date: w[3], start: 900, end: 960, title: "Design crit", cat: "design" },
    { id: "m11", date: w[4], start: 840, end: 900, title: "Demo", cat: "sales" },
    { id: "m12", date: w[4], start: 960, end: 1020, title: "Retro", cat: "eng" },
  ];

  const allDayEvents: AllDayEvent[] = [
    { id: "ad1@" + due(0), eventId: "ad1", date: due(0), title: "Launch freeze", color: "#5B9BFF", calendarId: "local-calendar" },
  ];

  const tasks: Task[] = [
    { id: "o1", title: "Fix onboarding crash", project: "Engineering", cat: "eng", est: 60, status: "needsAction", due: due(-2), completed: null, source: "gtasks" },
    { id: "o2", title: "Send investor update", project: "Work", cat: "work", est: 30, status: "needsAction", due: due(-1), completed: null, source: "gtasks" },
    // scheduled time blocks (task + block are one record)
    { id: "f0", title: "Write PRD", project: "Work", cat: "work", est: 90, status: "needsAction", due: w[0], completed: null, source: "gtasks", scheduled: true, block: { date: w[0], start: 660, end: 750 } },
    { id: "fb", title: "Inbox zero", project: "Work", cat: "work", est: 60, status: "completed", due: w[1], completed: "earlier this week", source: "gtasks", scheduled: true, block: { date: w[1], start: 840, end: 900 } },
    { id: "fa", title: "Code review backlog", project: "Engineering", cat: "eng", est: 90, status: "needsAction", due: w[3], completed: null, source: "gtasks", scheduled: true, block: { date: w[3], start: 780, end: 870 } },
    { id: "d1", title: "Draft Q3 board deck", project: "Work", cat: "work", est: 90, status: "needsAction", due: due(0), completed: null, source: "gtasks" },
    { id: "d2", title: "Review design specs", project: "Design", cat: "design", est: 45, status: "needsAction", due: due(0), completed: null, source: "gtasks" },
    { id: "d3", title: "Prep customer call", project: "Sales", cat: "sales", est: 30, status: "needsAction", due: due(0), completed: null, source: "gtasks" },
    { id: "d4", title: "Write standup notes", project: "Work", cat: "work", est: 15, status: "needsAction", due: due(0), completed: null, source: "gtasks" },
    { id: "u1", title: "Quarterly planning doc", project: "Work", cat: "work", est: 60, status: "needsAction", due: due(1), completed: null, source: "gtasks" },
    { id: "w1", title: "Review Q3 OKRs", project: "Work", cat: "work", est: 45, status: "needsAction", due: due(2), completed: null, source: "gtasks" },
    { id: "nw1", title: "Board prep deck", project: "Design", cat: "design", est: 60, status: "needsAction", due: due(6), completed: null, source: "gtasks" },
    { id: "l1", title: "Revamp 1:1 templates", project: "Engineering", cat: "eng", est: 45, status: "needsAction", due: due(14), completed: null, source: "gtasks" },
    { id: "i1", title: "Plan team offsite", project: "", cat: "work", est: 30, status: "needsAction", due: null, completed: null, source: "gtasks" },
    { id: "i2", title: "Research analytics tools", project: "", cat: "eng", est: 45, status: "needsAction", due: null, completed: null, source: "gtasks" },
    { id: "c1", title: "Ship release notes", project: "Work", cat: "work", est: 30, status: "completed", due: due(0), completed: "today, 8:42 AM", source: "gtasks" },
    { id: "e1", title: "Re: Contract redlines", project: "", cat: "email", est: 20, status: "needsAction", due: null, completed: null, source: "gmail", meta: "Sam Rivera" },
    { id: "e2", title: "Re: Q3 budget questions", project: "", cat: "email", est: 15, status: "needsAction", due: null, completed: null, source: "gmail", meta: "Dana Lee · Finance" },
    { id: "e3", title: "Intro: designer candidate", project: "", cat: "email", est: 10, status: "needsAction", due: null, completed: null, source: "gmail", meta: "Alex Kim" },
  ];

  return { events, allDayEvents, tasks };
}
