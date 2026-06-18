import { DAYS, TODAY_INDEX } from "../theme";
import type { CategoryKey } from "../theme";
import { catFromProject } from "./format";

export interface ParsedCapture {
  title: string;
  project: string | null;
  cat: CategoryKey | null;
  est: number | null;
  time: number | null; // minutes from midnight
  dayIdx: number | null; // 0..4
  dayLabel: string | null;
}

const DAY_MAP: Record<string, number> = {
  mon: 0, monday: 0,
  tue: 1, tues: 1, tuesday: 1,
  wed: 2, weds: 2, wednesday: 2,
  thu: 3, thur: 3, thurs: 3, thursday: 3,
  fri: 4, friday: 4,
};

/**
 * Parse a natural-language capture string into structured chips.
 * Mirrors the prototype's parseCapture (framed as gpt-5.4-nano).
 */
export function parseCapture(text: string): ParsedCapture {
  let t = " " + (text || "") + " ";
  let project: string | null = null;
  let cat: CategoryKey | null = null;
  let est: number | null = null;
  let time: number | null = null;
  let dayIdx: number | null = null;
  let dayLabel: string | null = null;
  let m: RegExpMatchArray | null;

  if ((m = t.match(/#(\w+)/))) {
    project = m[1];
    cat = catFromProject(project);
    t = t.replace(m[0], " ");
  }
  if ((m = t.match(/~?\s*(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i))) {
    const n = parseFloat(m[1]);
    const u = m[2].toLowerCase();
    est = u[0] === "h" ? Math.round(n * 60) : Math.round(n);
    t = t.replace(m[0], " ");
  }
  if ((m = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i))) {
    let h = parseInt(m[1]) % 12;
    if (/pm/i.test(m[3])) h += 12;
    const mm = m[2] ? parseInt(m[2]) : 0;
    time = h * 60 + mm;
    t = t.replace(m[0], " ");
  } else if ((m = t.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/i))) {
    let h = parseInt(m[1]);
    const mm = m[2] ? parseInt(m[2]) : 0;
    if (h < 7) h += 12;
    time = h * 60 + mm;
    t = t.replace(m[0], " ");
  }

  if (/\btoday\b/i.test(t)) {
    dayIdx = TODAY_INDEX;
    dayLabel = "Today";
    t = t.replace(/\btoday\b/i, " ");
  } else if (/\btomorrow\b/i.test(t)) {
    dayIdx = TODAY_INDEX + 1;
    dayLabel = "Tomorrow";
    t = t.replace(/\btomorrow\b/i, " ");
  } else {
    for (const key in DAY_MAP) {
      const re = new RegExp("\\b" + key + "\\b", "i");
      if (re.test(t)) {
        dayIdx = DAY_MAP[key];
        dayLabel = DAYS[dayIdx] ? DAYS[dayIdx].wd : key;
        t = t.replace(re, " ");
        break;
      }
    }
  }
  if (dayIdx != null && (dayIdx < 0 || dayIdx > 4)) dayIdx = null;

  let title = t
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(by|on|for|at|to)\s+/i, "")
    .replace(/\s+(by|on|for)$/i, "")
    .trim();
  if (title) title = title.charAt(0).toUpperCase() + title.slice(1);

  return { title, project, cat, est, time, dayIdx, dayLabel };
}
