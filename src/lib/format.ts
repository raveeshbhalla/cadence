import { END_HOUR, MON, START_HOUR, TODAY_INDEX, WD, WEEK_INDEX, DAYS } from "../theme";
import type { CategoryKey } from "../theme";

export function fmtTime(m: number): string {
  const h = Math.floor(m / 60);
  const mm = ((m % 60) + 60) % 60;
  const ap = h >= 12 ? "PM" : "AM";
  let hh = h % 12;
  if (hh === 0) hh = 12;
  return hh + (mm ? ":" + String(mm).padStart(2, "0") : "") + " " + ap;
}

export function fmtDur(m: number): string {
  if (m <= 0) return "0m";
  if (m < 60) return m + "m";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h + "h" + (mm ? " " + mm + "m" : "");
}

export function catFromProject(p: string): CategoryKey {
  p = (p || "").toLowerCase();
  if (/eng|dev|bug|code|api/.test(p)) return "eng";
  if (/design|ux|ui/.test(p)) return "design";
  if (/sale|customer|deal|demo/.test(p)) return "sales";
  if (/personal|health|gym|life|home/.test(p)) return "personal";
  if (/email|inbox|reply/.test(p)) return "email";
  return "work";
}

export function dateForOffset(o: number): Date {
  return new Date(2026, 5, 17 + o);
}

export type BucketKey =
  | "inbox"
  | "overdue"
  | "today"
  | "tomorrow"
  | "thisweek"
  | "nextweek"
  | "later"
  | "email"
  | "done";

export function bucketKey(due: number | null): BucketKey {
  if (due == null) return "inbox";
  if (due < 0) return "overdue";
  if (due === 0) return "today";
  if (due === 1) return "tomorrow";
  if (due <= 6 - WEEK_INDEX) return "thisweek";
  if (due <= 6 - WEEK_INDEX + 7) return "nextweek";
  return "later";
}

export function chipLabelFor(key: BucketKey, due: number | null): string {
  if (key === "tomorrow") return "Tomorrow";
  if (due == null) return "";
  const d = dateForOffset(due);
  if (key === "thisweek") return WD[d.getDay()];
  if (key === "nextweek") return WD[d.getDay()] + " " + d.getDate();
  if (key === "later") return MON[d.getMonth()] + " " + d.getDate();
  return "";
}

export function overdueLabel(n: number): string {
  if (n <= 0) return "earlier today";
  return n === 1 ? "1 day overdue" : n + " days overdue";
}

export function nowLabel(now: number): string {
  return "today, " + fmtTime(now);
}

// ── Grid coordinate helpers ──────────────────────────────────────
export function isPast(di: number, start: number, now: number): boolean {
  return di < TODAY_INDEX || (di === TODAY_INDEX && start < now);
}

export function isPastEvent(day: number, end: number, now: number): boolean {
  return day < TODAY_INDEX || (day === TODAY_INDEX && end <= now);
}

/** Pixel y → snapped minutes (unclamped). */
export function yToMinRaw(clientY: number, top: number, px: number): number {
  const min = START_HOUR * 60 + ((clientY - top) / px) * 60;
  return Math.round(min / 15) * 15;
}

/** Pixel y → snapped minutes, clamped to the visible grid. */
export function yToMin(clientY: number, top: number, px: number): number {
  const min = yToMinRaw(clientY, top, px);
  return Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - 15, min));
}

export const dayWd = (di: number) => DAYS[di]?.wd ?? "";
