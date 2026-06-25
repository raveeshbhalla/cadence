import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  AllDayEvent,
  Block,
  CalendarMeta,
  CalEvent,
  CaptureContext,
  DragPayload,
  DragState,
  DropTarget,
  EventDragState,
  ListMeta,
  ModalKind,
  RailDropTarget,
  RailMoveKey,
  ResizeState,
  SelDragState,
  Task,
  ToastState,
  UndoSnapshot,
} from "../types";
import type { CategoryKey, Density } from "../theme";

/** Minimal shape needed to begin moving a grid item (meeting or task block). */
type GridLike = { id: string; start: number; end: number; title: string; cat: CategoryKey };
export type AppView = "day" | "week" | "focus";
import { DEFAULT_ACCENT, END_HOUR, pxPerHour } from "../theme";
import { makeSeed } from "../data/seed";
import { addDays, dateKey, defaultWeekMonday, diffDays, isoAt, mondayOf, monthShort, nowMinutes, parseKey, todayKey, weekDates, weekdayShort } from "../lib/dates";
import { catFromProject, fmtDur, fmtTime, isPast, nowLabel, yToMinRaw } from "../lib/format";
import { parseCapture } from "../lib/parse";
import { railDueForKey, railMoveLabel } from "../lib/railDrop";
import { meetingLink } from "../lib/meeting";
import { playPop } from "../lib/sound";
import { taskListKey } from "../lib/taskLists";
import { api, isTauri, type EmailDto, type EventDto, type SyncSnapshotDto, type TaskDto } from "../lib/api";
import { usePointer } from "./pointer";

let toastTimer: ReturnType<typeof setTimeout> | undefined;

const INITIAL_MONDAY = defaultWeekMonday();
const INITIAL_TODAY = todayKey();
const SEED = makeSeed(INITIAL_MONDAY, INITIAL_TODAY);

const NOOP_STORAGE: Storage = {
  length: 0,
  clear: () => {},
  getItem: () => null,
  key: () => null,
  removeItem: () => {},
  setItem: () => {},
};

export interface AppState {
  // settings
  accent: string;
  density: Density;
  showEmail: boolean;
  sounds: boolean;

  // account
  account: string | null;
  lastSync: number | null; // epoch ms of last successful calendar pull
  isHydrating: boolean;

  // data
  events: CalEvent[];
  allDayEvents: AllDayEvent[];
  tasks: Task[];

  // time
  now: number; // minutes from local midnight
  today: string; // YYYY-MM-DD
  viewMonday: string; // Monday of the displayed week
  view: AppView;
  focusDay: string; // the single day shown in day view

  // chrome
  sidebarHidden: boolean;
  archivedShown: boolean;

  // sources (real Google calendars + task lists)
  calendars: CalendarMeta[];
  lists: ListMeta[];
  hiddenCals: string[]; // calendar ids toggled off
  hiddenLists: string[]; // task-list ids toggled off

  // modals
  modal: ModalKind;
  captureText: string;
  captureContext: CaptureContext | null;
  /** For a drag-selected capture: make it a task (true) vs a calendar event (false). */
  captureAsTask: boolean;
  captureEventDate: string;
  captureEventStart: number | null;
  captureEventDur: number;
  captureEventGuests: string;
  captureSubmitting: boolean;
  paletteQuery: string;
  /** Task id currently open in the detail editor, if any. */
  editorId: string | null;
  /** Meeting (event) id currently open in the details view, if any. */
  eventDetailsId: string | null;

  // ephemeral
  toast: ToastState | null;
  undoSnap: UndoSnapshot | null;

  // share-availability mode
  availabilityMode: boolean;
  availabilitySlots: { date: string; start: number; end: number }[];
  availabilityLabel: string;
  availabilityPrompt: "idle" | "copied" | "blocked" | "dismissed";

  // triage mode
  triageMode: boolean;
  triageIds: string[];
  triageIndex: number;

  /** Present/privacy mode: redact event & task titles (for screen-sharing). */
  presentMode: boolean;

  // interaction
  drag: DragState | null;
  eventDrag: EventDragState | null;
  resize: ResizeState | null;
  selDrag: SelDragState | null;
  dropTarget: DropTarget | null;
  railDropTarget: RailDropTarget | null;

  // ── actions ──
  setToast: (msg: string) => void;
  commit: (label: string, partial: Partial<AppState>, snap?: UndoSnapshot) => void;
  commitResizeTime: (id: string, snap: UndoSnapshot | null) => void;
  undo: () => void;
  tickNow: () => void;

  openCapture: () => void;
  openPalette: () => void;
  openSettings: () => void;
  openShortcuts: () => void;
  openGoto: () => void;
  openSearch: () => void;
  closeModal: () => void;
  joinNextMeeting: () => void;
  jumpToDate: (date: string) => void;
  addBufferAfter: (eventId: string) => void;
  bufferNextMeeting: () => void;
  togglePalette: () => void;
  setCaptureText: (t: string) => void;
  setCaptureAsTask: (v: boolean) => void;
  setCaptureEventDate: (v: string) => void;
  setCaptureEventStart: (v: number | null) => void;
  setCaptureEventDur: (v: number) => void;
  setCaptureEventGuests: (v: string) => void;
  setPaletteQuery: (q: string) => void;
  confirmCapture: () => void;
  createMeeting: (date: string, start: number, end: number, title: string, guests?: string[]) => void;

  toggleSidebar: () => void;
  toggleArchived: () => void;
  toggleEmailSource: () => void;
  toggleCalendar: (id: string) => void;
  toggleList: (id: string) => void;
  loadCalendars: () => void;

  hydrate: () => void;
  loadCachedSnapshot: () => void;
  refresh: () => void;
  loadTasks: () => void;
  loadCalendar: () => void;
  loadEmails: () => void;
  openEditor: (id: string) => void;
  closeEditor: () => void;
  openEventDetails: (id: string) => void;
  closeEventDetails: () => void;
  renameEvent: (id: string, title: string) => void;
  rescheduleEvent: (id: string, date: string, start: number, end: number) => void;
  deleteEvent: (id: string) => void;
  setEventRsvp: (id: string, responseStatus: NonNullable<CalEvent["responseStatus"]>) => void;
  moveAllDayEventToTime: (id: string, date: string, start: number, dur?: number) => void;
  renameTask: (id: string, title: string) => void;
  updateTaskDetails: (id: string, title: string, due: string | null, start: number | null, dur: number) => void;
  deleteTask: (id: string) => void;
  unscheduleTask: (id: string) => void;
  toggleTask: (id: string) => void;
  captureScheduled: (date: string, start: number, dur: number, title: string, cat: CategoryKey, project: string) => void;
  placeTask: (taskId: string, date: string, start: number, dur?: number) => void;
  moveTaskToRail: (taskId: string, key: RailMoveKey) => void;
  /** Push a task's due date to Google Tasks. */
  syncTaskDue: (taskId: string) => void;
  /** Write the scheduled time into the task's Google Tasks notes (due can't hold a time). */
  syncTaskTime: (taskId: string) => void;
  clearCompleted: () => void;
  rollOverdue: () => void;

  // drag lifecycle
  startTaskDrag: (payload: DragPayload, x: number, y: number) => void;
  startEventDrag: (item: GridLike, clientY: number, x: number, y: number, rectTop: number) => void;
  startResize: (item: { id: string }, edge: "top" | "bottom", rectTop: number) => void;
  startSelDrag: (di: number, clientY: number, rectTop: number) => void;
  setSelCurY: (y: number) => void;
  setInteraction: (partial: Partial<AppState>) => void;

  // navigation
  gotoToday: () => void;
  prevWeek: () => void;
  nextWeek: () => void;
  setView: (v: AppView) => void;
  shareAvailability: () => void;
  addAvailabilitySlot: (date: string, start: number, end: number) => void;
  removeAvailabilitySlot: (index: number) => void;
  setAvailabilityLabel: (text: string) => void;
  copyAvailability: () => void;
  blockAvailability: () => void;
  dismissAvailabilityPrompt: () => void;
  exitAvailability: () => void;
  startTriage: () => void;
  triageNext: () => void;
  exitTriage: () => void;
  togglePresent: () => void;
  setAccent: (a: string) => void;
  setDensity: (d: Density) => void;
  toggleSounds: () => void;
  setAccount: (email: string | null) => void;
  signOut: () => void;
  exportData: () => void;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
  accent: DEFAULT_ACCENT,
  density: "cozy",
  showEmail: true,
  sounds: true,

  account: null,
  lastSync: null,
  isHydrating: false,

  events: isTauri ? [] : SEED.events,
  allDayEvents: isTauri ? [] : SEED.allDayEvents,
  tasks: isTauri ? [] : SEED.tasks,

  now: nowMinutes(),
  today: INITIAL_TODAY,
  viewMonday: INITIAL_MONDAY,
  view: "week",
  focusDay: INITIAL_TODAY,

  sidebarHidden: false,
  archivedShown: false,

  calendars: [],
  lists: [],
  hiddenCals: [],
  hiddenLists: [],

  modal: null,
  captureText: "",
  captureContext: null,
  captureAsTask: true,
  captureEventDate: "",
  captureEventStart: null,
  captureEventDur: 0,
  captureEventGuests: "",
  captureSubmitting: false,
  paletteQuery: "",
  editorId: null,
  eventDetailsId: null,

  toast: null,
  undoSnap: null,

  availabilityMode: false,
  availabilitySlots: [],
  availabilityLabel: "",
  availabilityPrompt: "idle",

  triageMode: false,
  triageIds: [],
  triageIndex: 0,

  presentMode: false,

  drag: null,
  eventDrag: null,
  resize: null,
  selDrag: null,
  dropTarget: null,
  railDropTarget: null,

  setToast: (msg) => {
    set({ toast: { msg, undo: false } });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ toast: null }), 2300);
  },

  commit: (label, partial, snap) => {
    const s = get();
    const snapshot = snap || { events: s.events, allDayEvents: s.allDayEvents, tasks: s.tasks };
    set({ ...partial, undoSnap: snapshot, toast: { msg: label, undo: true } } as Partial<AppState>);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ toast: null }), 5000);
  },

  commitResizeTime: (id, snap) => {
    const s = get();
    const afterEv = s.events.find((e) => e.id === id);
    const beforeEv = snap?.events.find((e) => e.id === id);
    const afterTask = s.tasks.find((t) => t.id === id && t.block);
    const beforeTask = snap?.tasks.find((t) => t.id === id && t.block);
    const eventChanged = !!(afterEv && beforeEv && (afterEv.date !== beforeEv.date || afterEv.start !== beforeEv.start || afterEv.end !== beforeEv.end));
    const taskChanged = !!(afterTask?.block && beforeTask?.block && (afterTask.block.date !== beforeTask.block.date || afterTask.block.start !== beforeTask.block.start || afterTask.block.end !== beforeTask.block.end));
    if (!snap || (!eventChanged && !taskChanged)) return;

    const title = afterEv?.title || afterTask?.title || "item";
    set({ undoSnap: snap, toast: { msg: "Updating time…", undo: false } });
    clearTimeout(toastTimer);

    if (eventChanged && afterEv) {
      if (!isTauri || !s.account) {
        set({ toast: { msg: "Updated time", undo: true } });
        toastTimer = setTimeout(() => set({ toast: null }), 5000);
        return;
      }
      api
        .updateEvent(afterEv.calendarId || "primary", afterEv.id, isoAt(afterEv.date, afterEv.start), isoAt(afterEv.date, afterEv.end))
        .then(() => {
          set({ toast: { msg: "Updated time", undo: true } });
          clearTimeout(toastTimer);
          toastTimer = setTimeout(() => set({ toast: null }), 5000);
        })
        .catch((e) => {
          set({ events: snap.events, allDayEvents: snap.allDayEvents, tasks: snap.tasks, undoSnap: null, toast: { msg: "Couldn’t update time — " + shortErr(e), undo: false } });
          clearTimeout(toastTimer);
          toastTimer = setTimeout(() => set({ toast: null }), 3000);
        });
      return;
    }

    if (taskChanged) {
      get().syncTaskTime(id);
      set({ toast: { msg: "Updated time", undo: true } });
      toastTimer = setTimeout(() => set({ toast: null }), 5000);
      return;
    }

    s.setToast("Resized “" + title + "”");
  },

  undo: () => {
    const before = get();
    const snap = get().undoSnap;
    if (!snap) return;
    set({ events: snap.events, allDayEvents: snap.allDayEvents, tasks: snap.tasks, undoSnap: null, toast: { msg: "Change undone", undo: false } });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ toast: null }), 1800);
    if (isTauri && before.account) {
      for (const ev of snap.events) {
        const current = before.events.find((e) => e.id === ev.id);
        if (current && (current.date !== ev.date || current.start !== ev.start || current.end !== ev.end)) {
          api.updateEvent(ev.calendarId || "primary", ev.id, isoAt(ev.date, ev.start), isoAt(ev.date, ev.end)).catch(() => {});
        }
      }
    }
  },

  tickNow: () => {
    const now = nowMinutes();
    const today = todayKey();
    const s = get();
    if (now !== s.now || today !== s.today) set({ now, today });
  },

  openCapture: () => set({ modal: "capture", captureText: "", captureContext: null, captureAsTask: true, captureEventDate: "", captureEventStart: null, captureEventDur: 0, captureEventGuests: "", captureSubmitting: false }),
  openPalette: () => set({ modal: "palette", paletteQuery: "" }),
  openSettings: () => set({ modal: "settings" }),
  openShortcuts: () => set({ modal: "shortcuts" }),
  openGoto: () => set({ modal: "goto" }),
  openSearch: () => set({ modal: "search" }),
  closeModal: () => set({ modal: null, captureContext: null, captureSubmitting: false }),

  // Open the soonest upcoming meeting that has a conference link.
  joinNextMeeting: () => {
    const s = get();
    const next = s.events
      .map((e) => ({ e, link: meetingLink(e), abs: diffDays(e.date, s.today) * 1440 + e.start, absEnd: diffDays(e.date, s.today) * 1440 + e.end }))
      .filter((x) => x.link && x.absEnd > s.now)
      .sort((a, b) => a.abs - b.abs)[0];
    if (!next) {
      s.setToast("No upcoming meeting with a join link");
      return;
    }
    api.openUrl(next.link!);
    s.setToast("Joining " + next.e.title);
  },

  jumpToDate: (date) => {
    set({ viewMonday: mondayOf(parseKey(date)), focusDay: date, modal: null });
    get().loadCalendar();
  },

  // Insert a short transition buffer in the gap right after a meeting.
  addBufferAfter: (eventId) => {
    const s = get();
    const ev = s.events.find((e) => e.id === eventId);
    if (!ev) return;
    const starts = [
      ...s.events.filter((e) => e.date === ev.date && e.start >= ev.end).map((e) => e.start),
      ...s.tasks.filter((t) => t.block && t.block.date === ev.date && t.block.start >= ev.end).map((t) => t.block!.start),
    ];
    const nextStart = starts.length ? Math.min(...starts) : END_HOUR * 60;
    const gap = nextStart - ev.end;
    if (gap < 5) {
      s.setToast("No room for a buffer after this");
      return;
    }
    s.createMeeting(ev.date, ev.end, ev.end + Math.min(15, gap), "Buffer");
    s.closeEventDetails();
  },

  bufferNextMeeting: () => {
    const s = get();
    const next = s.events
      .map((e) => ({ e, abs: diffDays(e.date, s.today) * 1440 + e.start, absEnd: diffDays(e.date, s.today) * 1440 + e.end }))
      .filter((x) => x.absEnd > s.now)
      .sort((a, b) => a.abs - b.abs)[0];
    if (!next) {
      s.setToast("No upcoming meeting");
      return;
    }
    s.addBufferAfter(next.e.id);
  },
  togglePalette: () => set((s) => ({ modal: s.modal === "palette" ? null : "palette", paletteQuery: "" })),
  setCaptureText: (t) => set({ captureText: t }),
  setCaptureAsTask: (v) => set({ captureAsTask: v }),
  setCaptureEventDate: (v) => set({ captureEventDate: v }),
  setCaptureEventStart: (v) => set({ captureEventStart: v }),
  setCaptureEventDur: (v) => set({ captureEventDur: v }),
  setCaptureEventGuests: (v) => set({ captureEventGuests: v }),
  setPaletteQuery: (q) => set({ paletteQuery: q }),

  confirmCapture: async () => {
    const s = get();
    if (s.modal !== "capture" || s.captureSubmitting) return;
    set({ captureSubmitting: true });
    try {
    const ctx = s.captureContext;
    let p = parseCapture(s.captureText, s.today);
    // Capture defaults to a task; the toggle or a drag-selected block can make
    // it a calendar entry instead.
    const wantTask = s.captureAsTask || p.checkbox;
    // Upgrade the regex parse with the model when available (chips stayed instant).
    if (isTauri && s.captureText.trim()) {
      try {
        const ai = await api.aiParse(s.captureText, s.today);
        if (get().modal !== "capture") return; // dialog closed while we waited
        const resolvedDate = p.date ?? ai.date;
        p = {
          title: (ai.title || "").trim() || p.title,
          project: ai.list ?? p.project,
          cat: ai.list ? catFromProject(ai.list) : p.cat,
          est: p.est ?? ai.durationMin,
          time: p.time ?? ai.time,
          date: resolvedDate,
          dayLabel: resolvedDate ? dayLabelFor(resolvedDate, s.today) : p.dayLabel,
          checkbox: p.checkbox,
        };
      } catch {
        // model unavailable → keep the regex parse
      }
    }
    const cleanTitle = (p.title || "").replace(/\[\s*x?\s*\]/gi, " ").replace(/\s+/g, " ").trim();
    if (ctx && ctx.asBlock) {
      if (wantTask) {
        s.captureScheduled(ctx.date, ctx.start, ctx.end - ctx.start, cleanTitle || "Focus block", p.cat || "work", p.project || "");
      } else {
        const guests = parseGuestList(s.captureEventGuests);
        s.createMeeting(ctx.date, ctx.start, ctx.end, cleanTitle || "Untitled event", guests);
      }
      s.closeModal();
      return;
    }
    if (!p.title) {
      s.closeModal();
      return;
    }
    if (p.date && p.date < s.today) {
      s.setToast("Can’t add to a past day");
      return;
    }
    if (!wantTask) {
      const date = s.captureEventDate || p.date || "";
      const start = s.captureEventStart ?? p.time;
      const dur = Math.max(15, Math.min(12 * 60, s.captureEventDur || p.est || 30));
      const guests = parseGuestList(s.captureEventGuests);
      if (!date) {
        s.setToast("Choose a date");
        return;
      }
      if (start == null) {
        s.setToast("Choose a time");
        return;
      }
      if (isPast(date, start, s.today, s.now)) {
        s.setToast("Can’t schedule in the past");
        return;
      }
      s.createMeeting(date, start, start + dur, p.title, guests);
      s.closeModal();
      return;
    }
    if (p.time != null) {
      const date = p.date || s.today;
      if (isPast(date, p.time, s.today, s.now)) {
        s.setToast("Can’t schedule in the past");
        return;
      }
      s.captureScheduled(date, p.time, p.est || 30, p.title, p.cat || "work", p.project || "");
    } else {
      const id = "n" + Date.now();
      const tasks = s.tasks.concat([
        { id, title: p.title, project: p.project || "", cat: p.cat || "work", est: p.est || 30, status: "needsAction", due: p.date, completed: null, source: "gtasks" },
      ]);
      s.commit("Added “" + p.title + "” · " + (p.dayLabel || "No date"), { tasks });
      pushNewTask(id, p.title, p.date);
    }
    s.closeModal();
    } finally {
      set({ captureSubmitting: false });
    }
  },

  // Create a plain calendar event (meeting).
  createMeeting: (date, start, end, title, guests = []) => {
    const s = get();
    if (isPast(date, start, s.today, s.now)) {
      s.setToast("Can’t schedule in the past");
      return;
    }
    const id = "ev" + Date.now() + Math.floor(Math.random() * 99);
    const color = s.calendars.find((c) => c.primary)?.color;
    const event: CalEvent = { id, date, start, end, title, cat: "work", color, responseStatus: "accepted", canRsvp: guests.length > 0 };
    s.commit("Added “" + title + "” · " + weekdayShort(date) + " " + fmtTime(start), { events: s.events.concat([event]) });
    if (isTauri && s.account) {
      api
        .createMeeting(title, isoAt(date, start), isoAt(date, end), guests)
        .then((eventId) => useApp.setState((st) => ({ events: st.events.map((e) => (e.id === id ? { ...e, id: eventId } : e)) })))
        .catch(() => {});
    }
  },

  // Capture → a brand-new scheduled task (one shared record on grid + rail).
  captureScheduled: (date, start, dur, title, cat, project) => {
    const s = get();
    if (isPast(date, start, s.today, s.now)) {
      s.setToast("Can’t schedule in the past");
      return;
    }
    const id = "n" + Date.now() + Math.floor(Math.random() * 99);
    const tasks = s.tasks.concat([
      { id, title, project, cat: cat || "work", est: dur, status: "needsAction", due: date, completed: null, source: "gtasks", scheduled: true, block: { date, start, end: start + dur } },
    ]);
    s.commit("Added “" + title + "” · " + weekdayShort(date) + " " + fmtTime(start), { tasks });
    pushNewTask(id, title, date);
  },

  // Drag a rail task onto the grid → schedule it (or reschedule if already placed).
  placeTask: (taskId, date, start, dur) => {
    const s = get();
    const t = s.tasks.find((x) => x.id === taskId);
    if (!t) return;
    if (isPast(date, start, s.today, s.now)) {
      s.setToast("Can’t schedule in the past");
      return;
    }

    // Dragging an email onto the grid promotes it to a real, scheduled Google Task.
    if (t.source === "gmail") {
      const len = dur ?? t.est;
      const localId = "n" + Date.now() + Math.floor(Math.random() * 99);
      const converted: Task = { ...t, id: localId, source: "gtasks", scheduled: true, due: date, block: { date, start, end: start + len } };
      const tasks = s.tasks.map((x) => (x.id === taskId ? converted : x));
      s.commit("Scheduled “" + t.title + "” · " + weekdayShort(date) + " " + fmtTime(start), { tasks });
      if (isTauri && s.account) {
        const notes = t.emailThreadId ? `[cadence-email:${t.emailThreadId}]` : null;
        api
          .createTask("@default", t.title, date, notes)
          .then((dto) => {
            useApp.setState((st) => ({ tasks: st.tasks.map((x) => (x.id === localId ? { ...x, id: dto.id, listId: dto.listId, notes: dto.notes ?? undefined } : x)) }));
            useApp.getState().syncTaskTime(dto.id);
          })
          .catch(() => {});
      }
      return;
    }

    const len = dur ?? (t.block ? t.block.end - t.block.start : t.est);
    const wasScheduled = !!t.block;
    // Scheduling a task sets its due date to the scheduled day — so an overdue
    // task dragged forward is no longer overdue, and the rail bucket matches the grid.
    const tasks = s.tasks.map((x) => (x.id === taskId ? { ...x, scheduled: true, due: date, block: { date, start, end: start + len } } : x));
    const verb = wasScheduled ? "Rescheduled “" : "Added “";
    s.commit(verb + t.title + "” · " + weekdayShort(date) + " " + fmtTime(start), { tasks });
    get().syncTaskDue(taskId);
    get().syncTaskTime(taskId);
  },

  // Drag a task within the right rail → move it to a date bucket without
  // creating or moving a time block.
  moveTaskToRail: (taskId, key) => {
    const s = get();
    const t = s.tasks.find((x) => x.id === taskId);
    const due = railDueForKey(key, s.today);
    if (!t || t.status === "completed" || due === undefined) return;
    const label = railMoveLabel(key);

    // Dragging an email item into a task bucket promotes it to a real Google Task.
    if (t.source === "gmail") {
      const localId = "n" + Date.now() + Math.floor(Math.random() * 99);
      const converted: Task = { ...t, id: localId, source: "gtasks", due, scheduled: false, block: undefined };
      const tasks = s.tasks.map((x) => (x.id === taskId ? converted : x));
      s.commit("Moved “" + t.title + "” to " + label, { tasks });
      if (isTauri && s.account) {
        const notes = t.emailThreadId ? `[cadence-email:${t.emailThreadId}]` : null;
        api
          .createTask("@default", t.title, due, notes)
          .then((dto) => useApp.setState((st) => ({ tasks: st.tasks.map((x) => (x.id === localId ? { ...x, id: dto.id, listId: dto.listId, notes: dto.notes ?? undefined } : x)) })))
          .catch(() => {});
      }
      return;
    }

    const wasScheduled = !!t.block;
    const tasks = s.tasks.map((x) => (x.id === taskId ? { ...x, due, scheduled: false, block: undefined } : x));
    s.commit("Moved “" + t.title + "” to " + label, { tasks });
    get().syncTaskDue(taskId);
    if (wasScheduled) get().syncTaskTime(taskId);
  },

  // Push a task's due date to Google Tasks.
  syncTaskDue: (taskId) => {
    const s = get();
    if (!isTauri || !s.account) return;
    const t = s.tasks.find((x) => x.id === taskId);
    if (!t || t.source !== "gtasks" || !t.listId) return;
    api.setTaskDue(t.listId, taskId, t.due).catch(() => {});
  },

  // Google Tasks only stores a date on `due` (the time is discarded), so write the
  // scheduled time into the task's notes — the field Google preserves and shows.
  syncTaskTime: (taskId) => {
    const s = get();
    if (!isTauri || !s.account) return;
    const t = s.tasks.find((x) => x.id === taskId);
    if (!t || t.source !== "gtasks" || !t.listId) return;
    const notes = withTimeNote(t.notes, t.block ?? null);
    set((st) => ({ tasks: st.tasks.map((x) => (x.id === taskId ? { ...x, notes: notes || undefined } : x)) }));
    api.setTaskNotes(t.listId, taskId, notes).catch(() => {});
  },

  clearCompleted: () => set((s) => ({ tasks: s.tasks.filter((t) => t.status !== "completed") })),

  // Bump every unscheduled overdue task's due date to today (undoable + synced).
  rollOverdue: () => {
    const s = get();
    const overdue = s.tasks.filter((t) => t.status !== "completed" && t.source !== "gmail" && !t.block && t.due != null && t.due < s.today);
    if (!overdue.length) {
      s.setToast("No overdue tasks to roll");
      return;
    }
    const ids = new Set(overdue.map((t) => t.id));
    const tasks = s.tasks.map((t) => (ids.has(t.id) ? { ...t, due: s.today } : t));
    s.commit(`Rolled ${overdue.length} overdue task${overdue.length > 1 ? "s" : ""} to today`, { tasks });
    if (isTauri && s.account) {
      for (const t of overdue) if (t.listId) api.setTaskDue(t.listId, t.id, s.today).catch(() => {});
    }
  },

  toggleSidebar: () => set((s) => ({ sidebarHidden: !s.sidebarHidden })),
  toggleArchived: () => set((s) => ({ archivedShown: !s.archivedShown })),
  toggleEmailSource: () => set((s) => ({ showEmail: !s.showEmail })),
  toggleCalendar: (id) =>
    set((s) => ({ hiddenCals: s.hiddenCals.includes(id) ? s.hiddenCals.filter((x) => x !== id) : [...s.hiddenCals, id] })),
  toggleList: (id) =>
    set((s) => ({ hiddenLists: s.hiddenLists.includes(id) ? s.hiddenLists.filter((x) => x !== id) : [...s.hiddenLists, id] })),
  loadCalendars: () => {
    if (!isTauri || !get().account) return;
    api
      .listCalendars()
      .then((cals) => set({ calendars: cals }))
      .catch((e) => console.error("loadCalendars failed:", e));
  },

  // Load tasks first because task-owned scheduled blocks are restored from
  // Google Tasks notes; Calendar remains meetings/all-day events only.
  hydrate: async () => {
    if (!isTauri) return;
    const firstSync = get().lastSync == null;
    set({ isHydrating: true, ...(firstSync ? { events: [], allDayEvents: [], tasks: [] } : {}) });
    const { timeMin, timeMax } = calendarWindowBounds(get());
    let hadCache = false;
    try {
      const cached = await api.cachedSnapshot();
      hadCache = applySyncSnapshot(cached);
    } catch (e) {
      console.error("loadCachedSnapshot failed:", e);
    }
    if (hadCache) set({ isHydrating: false });

    api
      .refreshSnapshot(timeMin, timeMax)
      .then((snapshot) => {
        applySyncSnapshot(snapshot);
      })
      .catch((e) => {
        console.error("syncRefresh failed:", e);
        if (!hadCache) get().setToast("Couldn’t sync Google data — " + shortErr(e));
      })
      .finally(() => set({ isHydrating: false }));
  },

  loadCachedSnapshot: () => {
    if (!isTauri || !get().account) return;
    api
      .cachedSnapshot()
      .then((snapshot) => applySyncSnapshot(snapshot))
      .catch((e) => console.error("loadCachedSnapshot failed:", e));
  },

  // Manual re-sync.
  refresh: () => {
    if (!isTauri || !get().account) return;
    get().setToast("Syncing…");
    get().hydrate();
  },

  // Pull live Google Tasks (replacing seed). On failure (not signed in) keep seed.
  // Preserves any already-loaded Gmail tasks (a different source).
  loadTasks: () => {
    if (!isTauri) return;
    api
      .listTasks()
      .then((dtos) => set((s) => ({ tasks: mergeSources(dtos.map(dtoToTask), s.tasks.filter((t) => t.source === "gmail")), lists: listsFromDtos(dtos) })))
      .catch(() => {});
  },

  // Pull unreplied Primary email as lightweight tasks (preserving Google Tasks).
  loadEmails: () => {
    const s = get();
    if (!isTauri || !s.account) return;
    api
      .listEmails()
      .then((dtos: EmailDto[]) => {
        const emails: Task[] = dtos.map(emailDtoToTask);
        set((st) => ({ tasks: mergeSources(st.tasks.filter((t) => t.source !== "gmail"), emails) }));
      })
      .catch((e) => console.error("loadEmails failed:", e));
  },

  // Fetch a window of calendar events. Plain events become meetings; scheduled
  // task blocks are restored from Google Tasks notes, not Calendar entries.
  loadCalendar: () => {
    const s = get();
    if (!isTauri || !s.account) return;
    loadCalendarWindow(s)
      .then((dtos) => {
        const mapped = calendarDtosToState(dtos);
        set((st) => ({
          events: mapped.meetings,
          allDayEvents: mapped.allDay,
          lastSync: Date.now(),
          tasks: st.tasks,
        }));
      })
      .catch((e) => console.error("loadCalendar failed:", e));
  },

  openEditor: (id) => set({ editorId: id }),
  closeEditor: () => set({ editorId: null }),
  openEventDetails: (id) => set({ eventDetailsId: id }),
  closeEventDetails: () => set({ eventDetailsId: null }),
  renameEvent: (id, title) => {
    const s = get();
    const ev = s.events.find((e) => e.id === id);
    const clean = title.trim();
    if (!ev || !clean || clean === ev.title) return;
    set({ events: s.events.map((e) => (e.id === id ? { ...e, title: clean } : e)) });
    if (isTauri && s.account) {
      api.setEventTitle(id, clean).catch((e) => {
        useApp.setState((st) => ({ events: st.events.map((x) => (x.id === id ? { ...x, title: ev.title } : x)) }));
        get().setToast("Couldn’t rename event — " + shortErr(e));
      });
    }
  },
  rescheduleEvent: (id, date, start, end) => {
    const s = get();
    const ev = s.events.find((e) => e.id === id);
    if (!ev || end <= start) return;
    if (ev.date === date && ev.start === start && ev.end === end) return;
    set({ events: s.events.map((e) => (e.id === id ? { ...e, date, start, end } : e)) });
    if (isTauri && s.account) {
      api.updateEvent(ev.calendarId || "primary", id, isoAt(date, start), isoAt(date, end)).catch((e) => {
        useApp.setState((st) => ({ events: st.events.map((x) => (x.id === id ? ev : x)) }));
        get().setToast("Couldn’t update event — " + shortErr(e));
      });
    }
  },
  deleteEvent: (id) => {
    const s = get();
    const ev = s.events.find((e) => e.id === id);
    if (!ev) return;
    set({ events: s.events.filter((e) => e.id !== id), eventDetailsId: null });
    s.setToast("Deleted “" + ev.title + "”");
    if (isTauri && s.account) api.deleteEvent(id).catch((e) => get().setToast("Couldn’t delete event — " + shortErr(e)));
  },
  setEventRsvp: (id, responseStatus) => {
    const s = get();
    const ev = s.events.find((e) => e.id === id);
    if (!ev || !ev.canRsvp) return;
    set({ events: s.events.map((e) => (e.id === id ? { ...e, responseStatus } : e)) });
    if (isTauri && s.account) {
      api.setEventRsvp(ev.calendarId || "primary", ev.id, responseStatus).catch((e) => {
        useApp.setState((st) => ({ events: st.events.map((x) => (x.id === id ? { ...x, responseStatus: ev.responseStatus } : x)) }));
        get().setToast("RSVP failed — " + shortErr(e));
      });
    }
  },
  moveAllDayEventToTime: (id, date, start, dur = 30) => {
    const s = get();
    const allDay = s.allDayEvents.find((e) => e.id === id);
    if (!allDay) return;
    if (isPast(date, start, s.today, s.now)) {
      s.setToast("Can’t schedule in the past");
      return;
    }
    const eventId = allDay.eventId || allDay.id.split("@")[0];
    const end = Math.min(24 * 60, start + Math.max(15, dur));
    const timed: CalEvent = {
      id: eventId,
      date,
      start,
      end,
      title: allDay.title,
      cat: "work",
      calendarId: allDay.calendarId,
      color: allDay.color,
      responseStatus: allDay.responseStatus,
    };
    const allDayEvents = s.allDayEvents.filter((e) => (e.eventId || e.id.split("@")[0]) !== eventId);
    const events = s.events.filter((e) => e.id !== eventId).concat([timed]);
    s.commit("Scheduled “" + allDay.title + "” · " + weekdayShort(date) + " " + fmtTime(start), { allDayEvents, events });
    if (isTauri && s.account) {
      api.updateEvent(allDay.calendarId || "primary", eventId, isoAt(date, start), isoAt(date, end)).catch((e) => {
        get().setToast("Couldn’t sync event — " + shortErr(e));
      });
    }
  },

  renameTask: (id, title) => {
    const s = get();
    const t = s.tasks.find((x) => x.id === id);
    if (!t || !title.trim()) return;
    const clean = title.trim();
    set({ tasks: s.tasks.map((x) => (x.id === id ? { ...x, title: clean } : x)) });
    if (isTauri && s.account) {
      if (t.source === "gtasks" && t.listId) api.setTaskTitle(t.listId, id, clean).catch(() => {});
    }
  },

  updateTaskDetails: (id, title, due, start, dur) => {
    const s = get();
    const t = s.tasks.find((x) => x.id === id);
    const clean = title.trim();
    if (!t || !clean) return;
    const safeDur = Math.max(15, Math.min(12 * 60, dur || t.est || 30));
    const block = start != null && due ? { date: due, start, end: start + safeDur } : undefined;
    if (block && isPast(block.date, block.start, s.today, s.now)) {
      s.setToast("Can’t schedule in the past");
      return;
    }
    const notes = withTimeNote(t.notes, block ?? null);
    set({
      tasks: s.tasks.map((x) =>
        x.id === id
          ? {
              ...x,
              title: clean,
              due,
              est: safeDur,
              scheduled: !!block,
              block,
              notes: notes || undefined,
            }
          : x
      ),
    });
    if (isTauri && s.account && t.source === "gtasks" && t.listId) {
      if (clean !== t.title) api.setTaskTitle(t.listId, id, clean).catch(() => {});
      if (due !== t.due) api.setTaskDue(t.listId, id, due).catch(() => {});
      if (notes !== (t.notes || "")) api.setTaskNotes(t.listId, id, notes).catch(() => {});
    }
  },

  deleteTask: (id) => {
    const s = get();
    const t = s.tasks.find((x) => x.id === id);
    if (!t) return;
    set({ tasks: s.tasks.filter((x) => x.id !== id), editorId: null });
    s.setToast("Deleted “" + t.title + "”");
    if (isTauri && s.account) {
      if (t.source === "gtasks" && t.listId) api.deleteTask(t.listId, id).catch(() => {});
    }
  },

  unscheduleTask: (id) => {
    const s = get();
    const t = s.tasks.find((x) => x.id === id);
    if (!t || !t.block) return;
    const notes = withTimeNote(t.notes, null);
    set({ tasks: s.tasks.map((x) => (x.id === id ? { ...x, block: undefined, scheduled: false, notes: notes || undefined } : x)) });
    s.setToast("Unscheduled “" + t.title + "”");
    if (isTauri && s.account) {
      if (t.source === "gtasks" && t.listId) api.setTaskNotes(t.listId, id, notes).catch(() => {});
    }
  },

  // The single completion path — flips a task's status wherever it's shown,
  // and writes the change back to Google Tasks.
  toggleTask: (id) => {
    const s = get();
    const t = s.tasks.find((x) => x.id === id);
    if (!t) return;
    const completing = t.status !== "completed";
    const tasks = s.tasks.map((x) =>
      x.id === id ? ({ ...x, status: completing ? "completed" : "needsAction", completed: completing ? nowLabel(s.now) : null } as Task) : x
    );
    set({ tasks });
    if (completing && s.sounds) playPop();
    if (isTauri && s.account) {
      if (t.source === "gtasks" && t.listId) {
        api.setTaskStatus(t.listId, id, completing).catch(() => s.setToast("Couldn’t sync to Google Tasks"));
      }
      // Completing an email-linked task archives the thread out of the inbox.
      if (completing && t.emailThreadId) {
        api.archiveEmail(t.emailThreadId).catch(() => {});
      }
    }
  },

  startTaskDrag: (payload, x, y) => {
    if (payload.done) return;
    set({ drag: { payload, x, y, x0: x, y0: y, active: false }, dropTarget: null, railDropTarget: null });
  },
  startEventDrag: (item, clientY, x, y, rectTop) => {
    const px = pxPerHour(get().density);
    const grab = yToMinRaw(clientY, rectTop, px) - item.start;
    set({ eventDrag: { id: item.id, dur: item.end - item.start, title: item.title, cat: item.cat, grab, x, y, x0: x, y0: y, active: false } });
  },
  startResize: (item, edge, rectTop) => {
    opSnap = { events: get().events, allDayEvents: get().allDayEvents, tasks: get().tasks };
    set({ resize: { id: item.id, edge, rectTop } });
  },
  startSelDrag: (di, clientY, rectTop) => set({ selDrag: { di, y0: clientY, curY: clientY, rectTop } }),
  setSelCurY: (y) => set((s) => (s.selDrag ? { selDrag: { ...s.selDrag, curY: y } } : {})),
  setInteraction: (partial) => set(partial as Partial<AppState>),

  gotoToday: () => {
    set({ viewMonday: defaultWeekMonday(), focusDay: todayKey() });
    get().loadCalendar();
  },
  prevWeek: () => {
    set((s) => (s.view === "focus" ? {} : s.view === "day" ? { focusDay: addDays(s.focusDay, -1), viewMonday: mondayOf(parseKey(addDays(s.focusDay, -1))) } : { viewMonday: addDays(s.viewMonday, -7) }));
    get().loadCalendar();
  },
  nextWeek: () => {
    set((s) => (s.view === "focus" ? {} : s.view === "day" ? { focusDay: addDays(s.focusDay, 1), viewMonday: mondayOf(parseKey(addDays(s.focusDay, 1))) } : { viewMonday: addDays(s.viewMonday, 7) }));
    get().loadCalendar();
  },
  setView: (v) =>
    set((s) => {
      if (v === "focus") return { view: "focus", focusDay: s.today, viewMonday: mondayOf(parseKey(s.today)) };
      if (v === "day") {
        const wk = weekDates(s.viewMonday, 7);
        const fd = wk.includes(s.today) ? s.today : s.viewMonday;
        return { view: "day", focusDay: fd };
      }
      return { view: "week", viewMonday: mondayOf(parseKey(s.focusDay)) };
    }),
  // Enter availability mode: drag the grid to collect open slots, then copy them.
  shareAvailability: () =>
    set({ availabilityMode: true, availabilitySlots: [], availabilityLabel: "", availabilityPrompt: "idle", modal: null, toast: { msg: "Drag across the calendar to offer time slots", undo: false } }),
  addAvailabilitySlot: (date, start, end) =>
    set((s) => ({
      availabilitySlots: [...s.availabilitySlots, { date, start, end }].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.start - b.start)),
      availabilityPrompt: "idle",
    })),
  removeAvailabilitySlot: (index) => set((s) => ({ availabilitySlots: s.availabilitySlots.filter((_, i) => i !== index), availabilityPrompt: "idle" })),
  setAvailabilityLabel: (text) => set({ availabilityLabel: text }),
  copyAvailability: () => {
    const s = get();
    if (!s.availabilitySlots.length) return;
    const lines = s.availabilitySlots.map(
      (sl) => `• ${weekdayShort(sl.date)} ${monthShort(sl.date)} ${parseKey(sl.date).getDate()}, ${fmtTime(sl.start)} – ${fmtTime(sl.end)}`
    );
    const text = (s.availabilityLabel.trim() ? s.availabilityLabel.trim() + "\n" : "") + lines.join("\n");
    if (typeof navigator !== "undefined" && navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    set({ availabilityPrompt: "copied" });
    s.setToast(`Copied ${s.availabilitySlots.length} slot${s.availabilitySlots.length > 1 ? "s" : ""} to clipboard`);
  },
  blockAvailability: () => {
    const s = get();
    if (!s.availabilitySlots.length) return;
    const label = s.availabilityLabel.trim();
    const title = label ? "Hold: " + label : "Hold for availability";
    const color = s.calendars.find((c) => c.primary)?.color;
    const stamp = Date.now();
    const events = s.availabilitySlots.map((sl, i) => ({
      id: "ev" + stamp + i + Math.floor(Math.random() * 99),
      date: sl.date,
      start: sl.start,
      end: sl.end,
      title,
      cat: "work" as const,
      color,
    }));
    s.commit(`Blocked ${events.length} slot${events.length > 1 ? "s" : ""}`, { events: s.events.concat(events), availabilityPrompt: "blocked" });
    if (isTauri && s.account) {
      events.forEach((event) => {
        api
          .createMeeting(event.title, isoAt(event.date, event.start), isoAt(event.date, event.end))
          .then((eventId) => useApp.setState((st) => ({ events: st.events.map((e) => (e.id === event.id ? { ...e, id: eventId } : e)) })))
          .catch(() => {});
      });
    }
  },
  dismissAvailabilityPrompt: () => set({ availabilityPrompt: "dismissed" }),
  exitAvailability: () => set({ availabilityMode: false, availabilitySlots: [], availabilityLabel: "", availabilityPrompt: "idle" }),

  // Triage: queue up unscheduled overdue + today tasks for keyboard slotting.
  startTriage: () => {
    const s = get();
    const hiddenLists = s.hiddenLists || [];
    const ids = s.tasks
      .filter((t) => {
        if (t.status === "completed" || t.block) return false;
        const key = taskListKey(t);
        if (key && hiddenLists.includes(key)) return false;
        // unreplied email + overdue/today tasks
        if (t.source === "gmail") return s.showEmail;
        return t.due != null && t.due <= s.today;
      })
      // overdue/today first (by due), unreplied email (no due) last
      .sort((a, b) => (a.due ?? "9999") < (b.due ?? "9999") ? -1 : (a.due ?? "9999") > (b.due ?? "9999") ? 1 : 0)
      .map((t) => t.id);
    if (!ids.length) {
      s.setToast("Nothing to triage right now");
      return;
    }
    set({ triageMode: true, triageIds: ids, triageIndex: 0, modal: null });
  },
  triageNext: () =>
    set((s) => {
      const next = s.triageIndex + 1;
      if (next >= s.triageIds.length) {
        get().setToast("Triage complete");
        return { triageMode: false, triageIds: [], triageIndex: 0 };
      }
      return { triageIndex: next };
    }),
  exitTriage: () => set({ triageMode: false, triageIds: [], triageIndex: 0 }),
  togglePresent: () => set((s) => ({ presentMode: !s.presentMode })),

  setAccent: (a) => set({ accent: a }),
  setDensity: (d) => set({ density: d }),
  toggleSounds: () => set((s) => ({ sounds: !s.sounds })),
  setAccount: (email) => set({ account: email }),
  signOut: () => {
    const done = () => {
      set({ account: null });
      if (isTauri) location.reload();
    };
    api.signOut().then(done, done);
  },

  // Your data is never trapped: dump tasks + events to Downloads as JSON + CSV.
  exportData: () => {
    const s = get();
    const json = JSON.stringify({ exportedAt: new Date().toISOString(), account: s.account, tasks: s.tasks, events: s.events, allDayEvents: s.allDayEvents }, null, 2);
    const esc = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
    const rows = [["type", "title", "date_or_due", "start", "end", "status_or_list"].join(",")];
    for (const t of s.tasks) rows.push(["task", t.title, t.due || "", "", "", t.status].map(esc).join(","));
    for (const e of s.events) rows.push(["event", e.title, e.date, fmtTime(e.start), fmtTime(e.end), ""].map(esc).join(","));
    for (const a of s.allDayEvents) rows.push(["all-day", a.title, a.date, "", "", ""].map(esc).join(","));
    const csv = rows.join("\n");
    if (!isTauri) {
      s.setToast("Export runs in the desktop app");
      return;
    }
    api
      .exportData(json, csv)
      .then((path) => s.setToast("Exported to " + path.replace(/^.*\//, "~/Downloads/")))
      .catch((e) => s.setToast("Export failed — " + shortErr(e)));
  },
    }),
    {
      name: "cadence-settings",
      storage: createJSONStorage(() => (typeof localStorage !== "undefined" ? localStorage : NOOP_STORAGE)),
      partialize: (s) => ({
        accent: s.accent,
        density: s.density,
        showEmail: s.showEmail,
        sounds: s.sounds,
        view: s.view,
        sidebarHidden: s.sidebarHidden,
        archivedShown: s.archivedShown,
        hiddenCals: s.hiddenCals,
        hiddenLists: s.hiddenLists,
      }),
    }
  )
);

// ── Google Tasks mapping + write-back helpers ────────────────────
function fmtCompleted(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + ", " + dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function shortErr(e: unknown): string {
  const s = typeof e === "string" ? e : (e as { message?: string })?.message ?? String(e);
  return s.length > 160 ? s.slice(0, 160) + "…" : s;
}

function dayLabelFor(date: string, today: string): string {
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  return weekdayShort(date);
}

function eventDtoToCalEvent(d: EventDto): CalEvent {
  const s = new Date(d.start);
  const e = new Date(d.end);
  const start = s.getHours() * 60 + s.getMinutes();
  let end = e.getHours() * 60 + e.getMinutes();
  if (end <= start) end = start + 30; // crosses midnight / zero-length guard
  const titled = d.title && d.title !== "(no title)";
  return {
    id: d.id,
    date: dateKey(s),
    start,
    end,
    title: titled ? d.title : d.location || "(untitled)",
    cat: "work",
    calendarId: d.calendarId,
    color: d.color,
    location: d.location ?? undefined,
    description: d.description ?? undefined,
    hangoutLink: d.hangoutLink ?? undefined,
    timeZone: d.timeZone ?? undefined,
    responseStatus: d.responseStatus ?? undefined,
    canRsvp: d.canRsvp,
  };
}

function calendarWindowBounds(s: Pick<AppState, "viewMonday">): { timeMin: string; timeMax: string } {
  const timeMin = new Date(parseKey(addDays(s.viewMonday, -14))).toISOString();
  const timeMax = new Date(parseKey(addDays(s.viewMonday, 28))).toISOString();
  return { timeMin, timeMax };
}

function loadCalendarWindow(s: Pick<AppState, "viewMonday">): Promise<EventDto[]> {
  const { timeMin, timeMax } = calendarWindowBounds(s);
  return api.listEvents(timeMin, timeMax);
}

function applySyncSnapshot(snapshot: SyncSnapshotDto): boolean {
  if (!snapshot.syncedAt && !snapshot.tasks.length && !snapshot.calendars.length && !snapshot.events.length && !snapshot.emails.length) return false;
  const mapped = calendarDtosToState(snapshot.events);
  const googleTasks = snapshot.tasks.map(dtoToTask);
  const emailTasks = snapshot.emails.map(emailDtoToTask);
  useApp.setState({
    calendars: snapshot.calendars,
    events: mapped.meetings,
    allDayEvents: mapped.allDay,
    lists: listsFromDtos(snapshot.tasks),
    tasks: mergeSources(googleTasks, emailTasks),
    ...(snapshot.syncedAt ? { lastSync: snapshot.syncedAt } : {}),
  });
  return true;
}

function calendarDtosToState(dtos: EventDto[]): {
  meetings: CalEvent[];
  allDay: AllDayEvent[];
} {
  const meetings: CalEvent[] = [];
  const allDay: AllDayEvent[] = [];
  for (const d of dtos) {
    if (d.allDay) {
      const startDate = d.start.slice(0, 10);
      const endExcl = d.end.slice(0, 10);
      let cur = startDate;
      for (let i = 0; i < 60 && cur < endExcl; i++) {
        allDay.push({ id: d.id + "@" + cur, eventId: d.id, date: cur, title: d.title, color: d.color, calendarId: d.calendarId, responseStatus: d.responseStatus ?? undefined });
        cur = addDays(cur, 1);
      }
      if (startDate >= endExcl) allDay.push({ id: d.id + "@" + startDate, eventId: d.id, date: startDate, title: d.title, color: d.color, calendarId: d.calendarId, responseStatus: d.responseStatus ?? undefined });
      continue;
    }
    if (!d.cadenceTaskId) {
      meetings.push(eventDtoToCalEvent(d));
    }
  }
  return { meetings, allDay };
}

function emailDtoToTask(d: EmailDto): Task {
  return {
    id: d.id,
    title: d.subject,
    project: "",
    cat: "email",
    est: 15,
    status: "needsAction",
    due: null,
    completed: null,
    source: "gmail",
    meta: d.sender,
    emailThreadId: d.threadId,
    fromEmail: true,
  };
}

function parseGuestList(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[,\s;]+/)
        .map((x) => x.trim())
        .filter((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))
    )
  );
}

function listsFromDtos(dtos: TaskDto[]): ListMeta[] {
  const seen = new Map<string, string>();
  for (const d of dtos) if (d.listId && !seen.has(d.listId)) seen.set(d.listId, d.listTitle);
  return [...seen].map(([id, title]) => ({ id, title }));
}

// Managed "scheduled time" line we add to a Google Task's notes. We own any line
// starting with this sentinel; everything else (user notes, email marker) is kept.
const TIME_NOTE = "⏰ ";

/** Rebuild a task's notes for its current block, replacing our managed time line. */
function withTimeNote(notes: string | undefined, block: Block | null): string {
  const kept = (notes || "")
    .split("\n")
    .filter((ln) => !ln.startsWith(TIME_NOTE))
    .join("\n")
    .trim();
  if (!block) return kept;
  const line = `${TIME_NOTE}${weekdayShort(block.date)} ${fmtTime(block.start)}–${fmtTime(block.end)}`;
  return kept ? `${line}\n${kept}` : line;
}

function blockFromTimeNote(notes: string | undefined, due: string | null): Block | undefined {
  if (!notes || !due) return undefined;
  const line = notes.split("\n").find((ln) => ln.startsWith(TIME_NOTE));
  const m = line?.slice(TIME_NOTE.length).match(/^\S+\s+(.+?)\s*[–-]\s*(.+)$/);
  if (!m) return undefined;
  const start = parseStoredTime(m[1], m[2]);
  const end = parseStoredTime(m[2], m[1]);
  if (start == null || end == null || end <= start) return undefined;
  return { date: due, start, end };
}

function parseStoredTime(raw: string, fallbackMeridiemSource: string): number | null {
  const fallback = fallbackMeridiemSource.match(/\b(AM|PM)\b/i)?.[1];
  const m = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!m) return null;
  const ap = (m[3] || fallback || "").toUpperCase();
  let h = Number(m[1]);
  const mm = m[2] ? Number(m[2]) : 0;
  if (ap) {
    h %= 12;
    if (ap === "PM") h += 12;
  }
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

function dtoToTask(d: TaskDto): Task {
  const block = blockFromTimeNote(d.notes ?? undefined, d.due);
  return {
    id: d.id,
    title: d.title,
    project: d.listTitle,
    cat: d.fromEmail ? "email" : catFromProject(d.listTitle || d.title),
    est: block ? block.end - block.start : 30,
    status: d.status,
    due: d.due,
    completed: d.completed ? fmtCompleted(d.completed) : null,
    source: "gtasks",
    listId: d.listId,
    notes: d.notes ?? undefined,
    fromEmail: d.fromEmail || undefined,
    emailThreadId: d.emailThreadId ?? undefined,
    scheduled: !!block,
    block,
  };
}

/**
 * Merge Google Tasks with Gmail-surfaced emails, deduping: an email is dropped
 * when an email-linked task already represents it (same thread, or same subject).
 */
function mergeSources(gtasks: Task[], gmail: Task[]): Task[] {
  const linkedThreads = new Set(gtasks.map((t) => t.emailThreadId).filter(Boolean) as string[]);
  const linkedSubjects = new Set(gtasks.filter((t) => t.fromEmail).map((t) => t.title.trim().toLowerCase()));
  const fresh = gmail.filter(
    (e) => !(e.emailThreadId && linkedThreads.has(e.emailThreadId)) && !linkedSubjects.has(e.title.trim().toLowerCase())
  );
  return [...gtasks, ...fresh];
}

/** Create a just-added local task in Google Tasks, then swap in the real id. */
function pushNewTask(localId: string, title: string, due: string | null) {
  const s = useApp.getState();
  if (!isTauri || !s.account) return;
  api
    .createTask("@default", title, due)
    .then((dto) => {
      useApp.setState((st) => ({ tasks: st.tasks.map((t) => (t.id === localId ? { ...t, id: dto.id, listId: dto.listId } : t)) }));
      // A captured time block carries a time — keep it on the task notes.
      if (useApp.getState().tasks.find((t) => t.id === dto.id)?.block) {
        useApp.getState().syncTaskTime(dto.id);
      }
    })
    .catch(() => {});
}

// Snapshot taken at the start of a resize gesture, restored for undo.
let opSnap: UndoSnapshot | null = null;
export const getOpSnap = () => opSnap;
export const clearOpSnap = () => {
  opSnap = null;
};

/** The date keys currently shown on the grid (1 for day view, 7 for week). */
export function displayedDays(s: Pick<AppState, "view" | "focusDay" | "viewMonday">): string[] {
  if (s.view === "day") return [s.focusDay];
  if (s.view === "focus") return [todayKey()];
  return weekDates(s.viewMonday);
}

export { fmtDur, usePointer };
