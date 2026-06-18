import type { CategoryKey } from "../theme";
import type { Task } from "../types";
import { type BucketKey, bucketKey, chipLabelFor, isPastEvent, overdueLabel } from "../lib/format";
import { diffDays } from "../lib/dates";
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

export function buildRail(s: Pick<AppState, "tasks" | "showEmail" | "now" | "today">): RailData {
  const { today } = s;
  const act = s.tasks.filter((t) => t.status !== "completed");
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

  const archived = s.tasks.filter((t) => t.status === "completed").map((t) => rowFromTask(t, "done", false, today));
  return { sections, archived };
}

export { chipLabelFor };
