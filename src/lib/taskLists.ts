import type { Task } from "../types";

export function taskListKey(t: Pick<Task, "listId" | "project" | "source">): string | null {
  if (t.source === "gmail") return null;
  return t.listId || `project:${t.project || "No list"}`;
}

