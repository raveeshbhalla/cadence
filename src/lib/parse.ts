import type { CategoryKey } from "../theme";
import { catFromProject } from "./format";
import { addDays, nextDow, weekdayShort } from "./dates";

export interface ParsedCapture {
  title: string;
  project: string | null;
  cat: CategoryKey | null;
  est: number | null;
  time: number | null; // minutes from midnight
  date: string | null; // resolved YYYY-MM-DD
  dayLabel: string | null;
  /** True when the text used a markdown checkbox ("[ ]") to mean "make this a task". */
  checkbox: boolean;
}

// weekday name → JS getDay() index (0 Sun .. 6 Sat)
const DOW_MAP: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

/**
 * Parse a natural-language capture string into structured chips, resolving
 * dates relative to `today`. Mirrors the prototype's parser (framed as gpt-5.4-nano).
 */
export function parseCapture(text: string, today: string): ParsedCapture {
  let t = " " + (text || "") + " ";
  let project: string | null = null;
  let cat: CategoryKey | null = null;
  let est: number | null = null;
  let time: number | null = null;
  let date: string | null = null;
  let dayLabel: string | null = null;
  let m: RegExpMatchArray | null;

  // Markdown checkbox "[ ]" / "[]" / "[x]" → force this into a task.
  let checkbox = false;
  if (/\[\s*x?\s*\]/i.test(t)) {
    checkbox = true;
    t = t.replace(/\[\s*x?\s*\]/gi, " ");
  }

  if ((m = t.match(/#(\w+)/))) {
    project = m[1];
    cat = catFromProject(project);
    t = t.replace(m[0], " ");
  }
  // Time range, e.g. "7:45am-9am", "2-3pm", "9 to 10:30am" → start + duration.
  // (Parsed before plain duration so the range's digits aren't mistaken for one.)
  if ((m = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i))) {
    const ap1 = m[3] || m[6];
    const ap2 = m[6] || m[3];
    // Only treat as a time range if a meridiem or ":" is present (avoid "2-3 things").
    if (ap1 || ap2 || m[2] || m[5]) {
      const to24 = (h: string, mm: string | undefined, ap: string | undefined) => {
        let hh = parseInt(h) % (ap ? 12 : 24);
        if (ap && /pm/i.test(ap)) hh += 12;
        return hh * 60 + (mm ? parseInt(mm) : 0);
      };
      const startMin = to24(m[1], m[2], ap1);
      const endMin = to24(m[4], m[5], ap2);
      if (endMin > startMin) {
        time = startMin;
        est = endMin - startMin;
        t = t.replace(m[0], " ");
      }
    }
  }
  // Explicit duration, e.g. "~90m", "1h", "45 min" (overrides a range's implied length).
  if ((m = t.match(/~?\s*(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i))) {
    const n = parseFloat(m[1]);
    const u = m[2].toLowerCase();
    est = u[0] === "h" ? Math.round(n * 60) : Math.round(n);
    t = t.replace(m[0], " ");
  }
  if (time == null && (m = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i))) {
    let h = parseInt(m[1]) % 12;
    if (/pm/i.test(m[3])) h += 12;
    const mm = m[2] ? parseInt(m[2]) : 0;
    time = h * 60 + mm;
    t = t.replace(m[0], " ");
  }
  if (time == null && (m = t.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/i))) {
    let h = parseInt(m[1]);
    const mm = m[2] ? parseInt(m[2]) : 0;
    if (h < 7) h += 12;
    time = h * 60 + mm;
    t = t.replace(m[0], " ");
  }

  if (/\btoday\b/i.test(t)) {
    date = today;
    dayLabel = "Today";
    t = t.replace(/\btoday\b/i, " ");
  } else if (/\btomorrow\b/i.test(t)) {
    date = addDays(today, 1);
    dayLabel = "Tomorrow";
    t = t.replace(/\btomorrow\b/i, " ");
  } else {
    for (const key in DOW_MAP) {
      const re = new RegExp("\\b" + key + "\\b", "i");
      if (re.test(t)) {
        date = nextDow(today, DOW_MAP[key]);
        dayLabel = weekdayShort(date);
        t = t.replace(re, " ");
        break;
      }
    }
  }

  let title = t
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(by|on|for|at|to)\s+/i, "")
    .replace(/\s+(by|on|for)$/i, "")
    .trim();
  if (title) title = title.charAt(0).toUpperCase() + title.slice(1);

  return { title, project, cat, est, time, date, dayLabel, checkbox };
}
