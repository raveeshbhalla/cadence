import { addDays, mondayOf, parseKey } from "./dates";
import type { RailMoveKey } from "../types";

export const RAIL_MOVE_ORDER: RailMoveKey[] = ["today", "inbox", "tomorrow", "thisweek", "nextweek", "later"];

export function railMoveLabel(key: RailMoveKey): string {
  switch (key) {
    case "inbox":
      return "No date";
    case "today":
      return "Today";
    case "tomorrow":
      return "Tomorrow";
    case "thisweek":
      return "This week";
    case "nextweek":
      return "Next week";
    case "later":
      return "Later";
  }
}

export function railDueForKey(key: RailMoveKey, today: string): string | null | undefined {
  switch (key) {
    case "inbox":
      return null;
    case "today":
      return today;
    case "tomorrow":
      return addDays(today, 1);
    case "thisweek": {
      const due = addDays(today, 2);
      const sunday = addDays(mondayOf(parseKey(today)), 6);
      return due <= sunday ? due : undefined;
    }
    case "nextweek":
      return addDays(mondayOf(parseKey(today)), 7);
    case "later":
      return addDays(mondayOf(parseKey(today)), 14);
  }
}

export function isRailMoveKey(value: string): value is RailMoveKey {
  return (RAIL_MOVE_ORDER as string[]).includes(value);
}
