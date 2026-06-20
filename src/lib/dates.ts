import { MON, WD } from "../theme";

// All dates are local "YYYY-MM-DD" keys. Times are minutes from local midnight.

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseKey(k: string): Date {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return dateKey(new Date());
}

/** Minutes since local midnight, right now. */
export function nowMinutes(): number {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

export function addDays(k: string, n: number): string {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** Whole-day difference a − b (positive when a is later). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseKey(a).getTime() - parseKey(b).getTime()) / 86400000);
}

/** Monday (key) of the week containing `d`. */
export function mondayOf(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Mon = 0
  x.setDate(x.getDate() - dow);
  return dateKey(x);
}

/** The Mon-onward keys of the week starting at `mondayKey` (7 = Mon–Sun). */
export function weekDates(mondayKey: string, count = 7): string[] {
  return Array.from({ length: count }, (_, i) => addDays(mondayKey, i));
}

/** Default week to show: the week containing today. */
export function defaultWeekMonday(): string {
  const t = new Date();
  return mondayOf(t);
}

export const weekdayShort = (k: string) => WD[parseKey(k).getDay()];
export const dayOfMonth = (k: string) => parseKey(k).getDate();
export const monthLabel = (k: string) => `${MON[parseKey(k).getMonth()]} ${parseKey(k).getFullYear()}`;
export const monthShort = (k: string) => MON[parseKey(k).getMonth()];

/** Resolve a weekday index (0 Sun .. 6 Sat) to the next date on/after `today`. */
export function nextDow(today: string, dow: number): string {
  const delta = (dow - parseKey(today).getDay() + 7) % 7;
  return addDays(today, delta);
}

/** Combine a date key + minutes-from-midnight into an RFC3339 (UTC) timestamp. */
export function isoAt(date: string, minutes: number): string {
  const d = parseKey(date);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d.toISOString();
}
