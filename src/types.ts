import type { CategoryKey } from "./theme";

export type TaskSource = "gtasks" | "gmail";
export type TaskStatus = "needsAction" | "completed";

/** A scheduled slot on the grid. When a task carries one, it is a time block. */
export interface Block {
  date: string; // local YYYY-MM-DD
  start: number; // minutes from midnight
  end: number;
}

export interface Task {
  id: string;
  title: string;
  project: string;
  cat: CategoryKey;
  est: number; // minutes (estimate; default block duration)
  status: TaskStatus;
  /** Due date as a local YYYY-MM-DD key. null = inbox. */
  due: string | null;
  /** Human label set when completed (e.g. "today, 8:42 AM"). */
  completed: string | null;
  source: TaskSource;
  /** Google Tasks notes (carries the scheduled-time line + any email marker). */
  notes?: string;
  meta?: string; // email sender meta
  /** Linked Gmail thread (email-derived task or surfaced email). */
  emailThreadId?: string;
  /** True when this task is linked to / derived from an email. */
  fromEmail?: boolean;
  /** Google Tasks list id this task belongs to (for write-back). */
  listId?: string;
  /** Google Calendar event id backing this task's time block (for write-back). */
  eventId?: string;
  /** True when placed on the grid. Mirrors `block != null`. */
  scheduled?: boolean;
  /** The grid slot, when scheduled. A task + block is one shared record. */
  block?: Block;
}

/** A meeting — calendar-only, never a task, never has a checkbox. */
export interface CalEvent {
  id: string;
  date: string; // local YYYY-MM-DD
  start: number; // minutes from midnight
  end: number;
  title: string;
  cat: CategoryKey;
  calendarId?: string;
  color?: string; // calendar background colour
  location?: string;
  description?: string;
  hangoutLink?: string;
  timeZone?: string;
}

/** An all-day calendar item (birthday, PTO, deadline), shown in the banner lane. */
export interface AllDayEvent {
  id: string;
  date: string; // local YYYY-MM-DD (one entry per covered day)
  title: string;
  color?: string;
  calendarId?: string;
}

export interface CalendarMeta {
  id: string;
  summary: string;
  color: string;
  primary: boolean;
}

export interface ListMeta {
  id: string;
  title: string;
}

/**
 * A unified item rendered on the grid: either a meeting (event) or a scheduled
 * task (task + block). `id` is unique across both collections, so move/resize
 * can resolve the backing record by id alone.
 */
export interface GridItem {
  id: string;
  date: string; // local YYYY-MM-DD
  start: number;
  end: number;
  title: string;
  cat: CategoryKey;
  /** Scheduled task → true (has a checkbox). Meeting → false. */
  checkable: boolean;
  done: boolean;
  /** Calendar colour for meetings (task blocks use their category colour). */
  color?: string;
  /** This meeting overlaps another meeting (double-booked). */
  conflict?: boolean;
}

// ── Transient interaction state ──────────────────────────────────

/** A draggable payload from a rail row (a task, scheduled or not). */
export interface DragPayload {
  id: string; // task id
  title: string;
  est: number; // ghost duration
  cat: CategoryKey;
  done?: boolean;
}

export interface DragState {
  payload: DragPayload;
  x: number;
  y: number;
  x0: number;
  y0: number;
  active: boolean;
}

export interface EventDragState {
  id: string;
  dur: number;
  title: string;
  cat: CategoryKey;
  grab: number; // offset within block in minutes
  x: number;
  y: number;
  x0: number;
  y0: number;
  active: boolean;
}

export interface ResizeState {
  id: string;
  edge: "top" | "bottom";
  rectTop: number;
}

export interface SelDragState {
  di: number;
  y0: number;
  curY: number;
  rectTop: number;
}

export interface DropTarget {
  di: number;
  start: number;
  dur: number;
  cat: CategoryKey;
  valid: boolean;
}

export interface ToastState {
  msg: string;
  undo: boolean;
}

export interface UndoSnapshot {
  events: CalEvent[];
  tasks: Task[];
}

export type ModalKind = "capture" | "palette" | "settings" | "shortcuts" | "goto" | "search" | null;

export interface CaptureContext {
  asBlock: true;
  date: string; // local YYYY-MM-DD
  start: number;
  end: number;
}
