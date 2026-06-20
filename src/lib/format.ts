import { END_HOUR, START_HOUR } from "../theme";
import type { CategoryKey } from "../theme";
import { addDays, diffDays, monthShort, mondayOf, parseKey, weekdayShort } from "./dates";

export function fmtTime(m: number): string {
  const h = ((Math.floor(m / 60) % 24) + 24) % 24;
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

/** Bucket a due date (YYYY-MM-DD) relative to today. */
export function bucketKey(due: string | null, today: string): BucketKey {
  if (due == null) return "inbox";
  const d = diffDays(due, today);
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  const sundayThisWeek = addDays(mondayOf(parseKey(today)), 6);
  if (due <= sundayThisWeek) return "thisweek";
  const sundayNextWeek = addDays(sundayThisWeek, 7);
  if (due <= sundayNextWeek) return "nextweek";
  return "later";
}

export function chipLabelFor(key: BucketKey, due: string | null): string {
  if (key === "tomorrow") return "Tomorrow";
  if (due == null) return "";
  if (key === "thisweek") return weekdayShort(due);
  if (key === "nextweek") return weekdayShort(due) + " " + parseKey(due).getDate();
  if (key === "later") return monthShort(due) + " " + parseKey(due).getDate();
  return "";
}

export function overdueLabel(n: number): string {
  if (n <= 0) return "earlier today";
  return n === 1 ? "1 day overdue" : n + " days overdue";
}

export function nowLabel(now: number): string {
  return "today, " + fmtTime(now);
}

// ── Past / now detection (date-key based) ────────────────────────
export function isPast(date: string, start: number, today: string, nowMin: number): boolean {
  return date < today || (date === today && start < nowMin);
}

export function isPastEvent(date: string, end: number, today: string, nowMin: number): boolean {
  return date < today || (date === today && end <= nowMin);
}

// ── Grid coordinate helpers ──────────────────────────────────────
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
