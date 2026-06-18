import { END_HOUR } from "../theme";
import type { CategoryKey } from "../theme";
import type { Task } from "../types";
import { type BucketKey, bucketKey, chipLabelFor, fmtDur, fmtTime, isPastEvent, overdueLabel } from "../lib/format";
import { diffDays } from "../lib/dates";
import { taskListKey } from "../lib/taskLists";
import type { AppState } from "./app";

export interface RailRow {
  key: string;
  id: string;
  title: string;
  done: boolean;
  est: number;
  cat: CategoryKey;
  isEmail: boolean;
  showDot: boolean;
  meta: string;
  bucket: BucketKey;
  due: string | null;
  dueLabel: string;
  scheduled: boolean;
  completedLabel: string;
}

export interface RailSection {
  label: string;
  rows: RailRow[];
  color: string | null;
}

/** True when a task is placed on the grid in the past and still open. */
function isPastBlock(t: Task, today: string, now: number): boolean {
  return !!(t.scheduled && t.block && isPastEvent(t.block.date, t.block.end, today, now));
}

function rowFromTask(t: Task, key: BucketKey, asBlock: boolean, today: string): RailRow {
  const isEmail = t.source === "gmail" || t.cat === "email";
  const done = t.status === "completed";
  const blockDur = t.block ? t.block.end - t.block.start : t.est;
  return {
    key: t.id,
    id: t.id,
    title: t.title,
    done,
    est: asBlock ? blockDur : t.est,
    cat: t.cat,
    isEmail,
    showDot: !isEmail && !!t.project,
    meta: asBlock ? "Time block" : isEmail ? t.meta || "" : t.project || "No project",
    bucket: key,
    due: t.due,
    dueLabel: asBlock
      ? overdueLabel(t.block ? diffDays(today, t.block.date) : 0)
      : key === "overdue" && t.due
        ? overdueLabel(diffDays(today, t.due))
        : "",
    // Future scheduled tasks show "blocked ✓"; a past block shows its overdue label instead.
    scheduled: !asBlock && !!t.scheduled,
    completedLabel: t.completed || "",
  };
}

export interface RailData {
  sections: RailSection[];
  archived: RailRow[];
}

export function buildRail(s: Pick<AppState, "tasks" | "showEmail" | "now" | "today"> & { hiddenLists?: string[] }): RailData {
  const { today } = s;
  const hiddenLists = s.hiddenLists || [];
  const visible = s.tasks.filter((t) => {
    const key = taskListKey(t);
    return !(key && hiddenLists.includes(key));
  });
  const act = visible.filter((t) => t.status !== "completed");
  const overdue: RailRow[] = [];
  const buckets: Record<string, RailRow[]> = { today: [], inbox: [], tomorrow: [], thisweek: [], nextweek: [], later: [] };

  for (const t of act) {
    if (t.source === "gmail") continue;
    if (isPastBlock(t, today, s.now)) {
      overdue.push(rowFromTask(t, "overdue", true, today));
      continue;
    }
    const k = bucketKey(t.due, today);
    if (k === "overdue") overdue.push(rowFromTask(t, "overdue", false, today));
    else buckets[k].push(rowFromTask(t, k, false, today));
  }

  const emailRows = act.filter((t) => t.source === "gmail").map((t) => rowFromTask(t, "email", false, today));

  const sections: RailSection[] = [
    { label: "Overdue", rows: overdue, color: "#E5736B" },
    { label: "Today", rows: buckets.today, color: null },
    { label: "Email · needs reply", rows: s.showEmail ? emailRows : [], color: null },
    { label: "Inbox", rows: buckets.inbox, color: null },
    { label: "Tomorrow", rows: buckets.tomorrow, color: null },
    { label: "This week", rows: buckets.thisweek, color: null },
    { label: "Next week", rows: buckets.nextweek, color: null },
    { label: "Later", rows: buckets.later, color: null },
  ].filter((sec) => sec.rows.length > 0);

  const archived = visible.filter((t) => t.status === "completed").map((t) => rowFromTask(t, "done", false, today));
  return { sections, archived };
}

export { chipLabelFor };

export interface DayLoad {
  freeLabel: string;
  free: number;
  workload: number;
  overflow: boolean;
  overflowLabel: string;
  taskCount: number;
}

export interface NowFocus {
  kind: "in" | "next" | "do" | "clear";
  title: string;
  sub: string;
  taskId?: string;
}

/** What to pay attention to right now: current activity, next up, or a task to start. */
export function nowFocus(s: Pick<AppState, "tasks" | "events" | "now" | "today" | "showEmail" | "hiddenLists">): NowFocus {
  const { now, today } = s;
  const hiddenLists = s.hiddenLists || [];
  const todayItems = [
    ...s.events.filter((e) => e.date === today).map((e) => ({ start: e.start, end: e.end, title: e.title })),
    ...s.tasks
      .filter((t) => t.block && t.block.date === today && t.status !== "completed")
      .map((t) => ({ start: t.block!.start, end: t.block!.end, title: t.title })),
  ];

  const cur = todayItems.find((it) => it.start <= now && now < it.end);
  if (cur) return { kind: "in", title: cur.title, sub: `ends in ${fmtDur(cur.end - now)}` };

  const next = todayItems.filter((it) => it.start > now).sort((a, b) => a.start - b.start)[0];
  if (next) {
    const mins = next.start - now;
    return { kind: "next", title: next.title, sub: mins < 60 ? `in ${mins}m` : `at ${fmtTime(next.start)}` };
  }

  const task = s.tasks
    .filter((t) => {
      if (t.status === "completed" || t.scheduled) return false;
      const key = taskListKey(t);
      if (key && hiddenLists.includes(key)) return false;
      if (t.source === "gmail") return false;
      return t.due != null && t.due <= today;
    })
    .sort((a, b) => (a.due! < b.due! ? -1 : a.due! > b.due! ? 1 : b.est - a.est))[0];
  if (task) return { kind: "do", title: task.title, sub: `~${fmtDur(task.est)}`, taskId: task.id };

  return { kind: "clear", title: "All caught up", sub: "nothing scheduled or due" };
}

/** Today's commitment: unscheduled work to do vs. free time left in the day. */
export function dayLoad(s: Pick<AppState, "tasks" | "events" | "now" | "today" | "showEmail" | "hiddenLists">): DayLoad {
  const hiddenLists = s.hiddenLists || [];
  const visible = s.tasks.filter((t) => {
    const key = taskListKey(t);
    return !(key && hiddenLists.includes(key));
  });

  // Work still to place: overdue + today's tasks (and email, if shown) not done, not scheduled.
  const toDo = visible.filter((t) => {
    if (t.status === "completed" || t.scheduled) return false;
    if (t.source === "gmail") return s.showEmail;
    return t.due != null && t.due <= s.today;
  });
  const workload = toDo.reduce((a, t) => a + t.est, 0);
  const taskCount = toDo.length;

  // Time already booked between now and end of day.
  let busy = 0;
  for (const e of s.events) if (e.date === s.today && e.end > s.now) busy += e.end - Math.max(e.start, s.now);
  for (const t of s.tasks) if (t.block && t.block.date === s.today && t.block.end > s.now) busy += t.block.end - Math.max(t.block.start, s.now);

  const free = Math.max(0, END_HOUR * 60 - s.now - busy);
  const overflow = workload > free;
  return {
    free,
    freeLabel: fmtDur(free),
    workload,
    taskCount,
    overflow,
    overflowLabel: overflow ? `Over by ${fmtDur(workload - free)}` : "",
  };
}
