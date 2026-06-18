import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  CalEvent,
  CaptureContext,
  DragPayload,
  DragState,
  DropTarget,
  EventDragState,
  ModalKind,
  ResizeState,
  SelDragState,
  Task,
  ToastState,
  UndoSnapshot,
} from "../types";
import type { CategoryKey, Density } from "../theme";

/** Minimal shape needed to begin moving a grid item (meeting or task block). */
type GridLike = { id: string; start: number; end: number; title: string; cat: CategoryKey };
import { DEFAULT_ACCENT, pxPerHour } from "../theme";
import { makeSeed } from "../data/seed";
import { addDays, dateKey, defaultWeekMonday, isoAt, nowMinutes, parseKey, todayKey, weekdayShort } from "../lib/dates";
import { catFromProject, fmtDur, fmtTime, isPast, nowLabel, yToMinRaw } from "../lib/format";
import { parseCapture } from "../lib/parse";
import { api, isTauri, type EmailDto, type EventDto, type TaskDto } from "../lib/api";
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

  // account
  account: string | null;

  // data
  events: CalEvent[];
  tasks: Task[];

  // time
  now: number; // minutes from local midnight
  today: string; // YYYY-MM-DD
  viewMonday: string; // Monday of the displayed week

  // chrome
  sidebarHidden: boolean;
  archivedShown: boolean;
  hidden: Set<CategoryKey>;

  // modals
  modal: ModalKind;
  captureText: string;
  captureContext: CaptureContext | null;
  paletteQuery: string;
  /** Task id currently open in the detail editor, if any. */
  editorId: string | null;

  // ephemeral
  toast: ToastState | null;
  undoSnap: UndoSnapshot | null;

  // interaction
  drag: DragState | null;
  eventDrag: EventDragState | null;
  resize: ResizeState | null;
  selDrag: SelDragState | null;
  dropTarget: DropTarget | null;

  // ── actions ──
  setToast: (msg: string) => void;
  commit: (label: string, partial: Partial<AppState>, snap?: UndoSnapshot) => void;
  undo: () => void;
  tickNow: () => void;

  openCapture: () => void;
  openPalette: () => void;
  openSettings: () => void;
  closeModal: () => void;
  togglePalette: () => void;
  setCaptureText: (t: string) => void;
  setPaletteQuery: (q: string) => void;
  confirmCapture: () => void;

  toggleSidebar: () => void;
  toggleArchived: () => void;
  toggleEmailSource: () => void;
  toggleCal: (cat: CategoryKey) => void;

  hydrate: () => void;
  loadTasks: () => void;
  loadCalendar: () => void;
  loadEmails: () => void;
  openEditor: (id: string) => void;
  closeEditor: () => void;
  renameTask: (id: string, title: string) => void;
  deleteTask: (id: string) => void;
  unscheduleTask: (id: string) => void;
  toggleTask: (id: string) => void;
  captureScheduled: (date: string, start: number, dur: number, title: string, cat: CategoryKey, project: string) => void;
  placeTask: (taskId: string, date: string, start: number) => void;
  /** Push a task's current block to Google Calendar (create or update the event). */
  syncBlock: (taskId: string) => void;
  clearCompleted: () => void;

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
  shareAvailability: () => void;
  setAccent: (a: string) => void;
  setDensity: (d: Density) => void;
  setAccount: (email: string | null) => void;
  signOut: () => void;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
  accent: DEFAULT_ACCENT,
  density: "cozy",
  showEmail: true,

  account: null,

  events: SEED.events,
  tasks: SEED.tasks,

  now: nowMinutes(),
  today: INITIAL_TODAY,
  viewMonday: INITIAL_MONDAY,

  sidebarHidden: false,
  archivedShown: false,
  hidden: new Set(),

  modal: null,
  captureText: "",
  captureContext: null,
  paletteQuery: "",
  editorId: null,

  toast: null,
  undoSnap: null,

  drag: null,
  eventDrag: null,
  resize: null,
  selDrag: null,
  dropTarget: null,

  setToast: (msg) => {
    set({ toast: { msg, undo: false } });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ toast: null }), 2300);
  },

  commit: (label, partial, snap) => {
    const s = get();
    const snapshot = snap || { events: s.events, tasks: s.tasks };
    set({ ...partial, undoSnap: snapshot, toast: { msg: label, undo: true } } as Partial<AppState>);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ toast: null }), 5000);
  },

  undo: () => {
    const snap = get().undoSnap;
    if (!snap) return;
    set({ events: snap.events, tasks: snap.tasks, undoSnap: null, toast: { msg: "Change undone", undo: false } });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ toast: null }), 1800);
  },

  tickNow: () => {
    const now = nowMinutes();
    const today = todayKey();
    const s = get();
    if (now !== s.now || today !== s.today) set({ now, today });
  },

  openCapture: () => set({ modal: "capture", captureText: "", captureContext: null }),
  openPalette: () => set({ modal: "palette", paletteQuery: "" }),
  openSettings: () => set({ modal: "settings" }),
  closeModal: () => set({ modal: null, captureContext: null }),
  togglePalette: () => set((s) => ({ modal: s.modal === "palette" ? null : "palette", paletteQuery: "" })),
  setCaptureText: (t) => set({ captureText: t }),
  setPaletteQuery: (q) => set({ paletteQuery: q }),

  confirmCapture: async () => {
    const s = get();
    const ctx = s.captureContext;
    let p = parseCapture(s.captureText, s.today);
    // Upgrade the regex parse with the model when available (chips stayed instant).
    if (isTauri && s.captureText.trim()) {
      try {
        const ai = await api.aiParse(s.captureText, s.today);
        if (s.modal !== "capture") return; // dialog closed while we waited
        const date = ai.date ?? p.date;
        p = {
          title: (ai.title || "").trim() || p.title,
          project: ai.list ?? p.project,
          cat: ai.list ? catFromProject(ai.list) : p.cat,
          est: ai.durationMin ?? p.est,
          time: ai.time ?? p.time,
          date,
          dayLabel: date ? dayLabelFor(date, s.today) : p.dayLabel,
        };
      } catch {
        // model unavailable → keep the regex parse
      }
    }
    if (ctx && ctx.asBlock) {
      s.captureScheduled(ctx.date, ctx.start, ctx.end - ctx.start, p.title || "Focus block", p.cat || "work", p.project || "");
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
      s.commit("Added “" + p.title + "” · " + (p.dayLabel || "Inbox"), { tasks });
      pushNewTask(id, p.title, p.date);
    }
    s.closeModal();
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
  placeTask: (taskId, date, start) => {
    const s = get();
    const t = s.tasks.find((x) => x.id === taskId);
    if (!t) return;
    if (isPast(date, start, s.today, s.now)) {
      s.setToast("Can’t schedule in the past");
      return;
    }
    const dur = t.block ? t.block.end - t.block.start : t.est;
    const wasScheduled = !!t.block;
    const tasks = s.tasks.map((x) => (x.id === taskId ? { ...x, scheduled: true, block: { date, start, end: start + dur } } : x));
    const verb = wasScheduled ? "Rescheduled “" : "Added “";
    s.commit(verb + t.title + "” · " + weekdayShort(date) + " " + fmtTime(start), { tasks });
    get().syncBlock(taskId);
  },

  // Create or update the Google Calendar event backing a task's time block.
  syncBlock: (taskId) => {
    const s = get();
    if (!isTauri || !s.account) return;
    const t = s.tasks.find((x) => x.id === taskId);
    if (!t || !t.block || t.source !== "gtasks") return;
    const startIso = isoAt(t.block.date, t.block.start);
    const endIso = isoAt(t.block.date, t.block.end);
    if (t.eventId) {
      api.updateEvent(t.eventId, startIso, endIso).catch(() => {});
    } else {
      api
        .createEvent(t.title, startIso, endIso, t.id)
        .then((eventId) => set((st) => ({ tasks: st.tasks.map((x) => (x.id === taskId ? { ...x, eventId } : x)) })))
        .catch(() => {});
    }
  },

  clearCompleted: () => set((s) => ({ tasks: s.tasks.filter((t) => t.status !== "completed") })),

  toggleSidebar: () => set((s) => ({ sidebarHidden: !s.sidebarHidden })),
  toggleArchived: () => set((s) => ({ archivedShown: !s.archivedShown })),
  toggleEmailSource: () => set((s) => ({ showEmail: !s.showEmail })),
  toggleCal: (cat) =>
    set((s) => {
      const h = new Set(s.hidden);
      h.has(cat) ? h.delete(cat) : h.add(cat);
      return { hidden: h };
    }),

  // Load everything in order so blocks (calendar) can attach to tasks (Tasks API).
  hydrate: async () => {
    if (!isTauri) return;
    try {
      const dtos = await api.listTasks();
      set((s) => ({ tasks: [...dtos.map(dtoToTask), ...s.tasks.filter((t) => t.source === "gmail")] }));
    } catch {
      return; // not signed in → keep seed
    }
    get().loadCalendar();
    get().loadEmails();
  },

  // Pull live Google Tasks (replacing seed). On failure (not signed in) keep seed.
  // Preserves any already-loaded Gmail tasks (a different source).
  loadTasks: () => {
    if (!isTauri) return;
    api
      .listTasks()
      .then((dtos) => set((s) => ({ tasks: [...dtos.map(dtoToTask), ...s.tasks.filter((t) => t.source === "gmail")] })))
      .catch(() => {});
  },

  // Pull unreplied Primary email as lightweight tasks (preserving Google Tasks).
  loadEmails: () => {
    const s = get();
    if (!isTauri || !s.account) return;
    api
      .listEmails()
      .then((dtos: EmailDto[]) => {
        const emails: Task[] = dtos.map((d) => ({
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
        }));
        set((st) => ({ tasks: [...st.tasks.filter((t) => t.source !== "gmail"), ...emails] }));
      })
      .catch(() => {});
  },

  // Fetch a window of calendar events: plain ones become meetings; Cadence
  // time-block events reattach to their tasks (so scheduling survives reload).
  loadCalendar: () => {
    const s = get();
    if (!isTauri || !s.account) return;
    const timeMin = new Date(parseKey(addDays(s.viewMonday, -14))).toISOString();
    const timeMax = new Date(parseKey(addDays(s.viewMonday, 28))).toISOString();
    api
      .listEvents(timeMin, timeMax)
      .then((dtos) => {
        const meetings: CalEvent[] = [];
        const blocks = new Map<string, { eventId: string; date: string; start: number; end: number }>();
        for (const d of dtos) {
          if (d.allDay) continue;
          if (d.cadenceTaskId) {
            const sd = new Date(d.start);
            const ed = new Date(d.end);
            let st = sd.getHours() * 60 + sd.getMinutes();
            let en = ed.getHours() * 60 + ed.getMinutes();
            if (en <= st) en = st + 30;
            blocks.set(d.cadenceTaskId, { eventId: d.id, date: dateKey(sd), start: st, end: en });
          } else {
            meetings.push(eventDtoToCalEvent(d));
          }
        }
        set((st) => ({
          events: meetings,
          tasks: st.tasks.map((t) => {
            const b = blocks.get(t.id);
            return b ? { ...t, scheduled: true, eventId: b.eventId, block: { date: b.date, start: b.start, end: b.end } } : t;
          }),
        }));
      })
      .catch(() => {});
  },

  openEditor: (id) => set({ editorId: id }),
  closeEditor: () => set({ editorId: null }),

  renameTask: (id, title) => {
    const s = get();
    const t = s.tasks.find((x) => x.id === id);
    if (!t || !title.trim()) return;
    const clean = title.trim();
    set({ tasks: s.tasks.map((x) => (x.id === id ? { ...x, title: clean } : x)) });
    if (isTauri && s.account) {
      if (t.source === "gtasks" && t.listId) api.setTaskTitle(t.listId, id, clean).catch(() => {});
      if (t.eventId) api.setEventTitle(t.eventId, clean).catch(() => {});
    }
  },

  deleteTask: (id) => {
    const s = get();
    const t = s.tasks.find((x) => x.id === id);
    if (!t) return;
    set({ tasks: s.tasks.filter((x) => x.id !== id), editorId: null });
    s.setToast("Deleted “" + t.title + "”");
    if (isTauri && s.account) {
      if (t.eventId) api.deleteEvent(t.eventId).catch(() => {});
      if (t.source === "gtasks" && t.listId) api.deleteTask(t.listId, id).catch(() => {});
    }
  },

  unscheduleTask: (id) => {
    const s = get();
    const t = s.tasks.find((x) => x.id === id);
    if (!t || !t.block) return;
    set({ tasks: s.tasks.map((x) => (x.id === id ? { ...x, block: undefined, scheduled: false, eventId: undefined } : x)) });
    s.setToast("Unscheduled “" + t.title + "”");
    if (isTauri && s.account && t.eventId) api.deleteEvent(t.eventId).catch(() => {});
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
    if (isTauri && s.account && t.source === "gtasks" && t.listId) {
      api.setTaskStatus(t.listId, id, completing).catch(() => s.setToast("Couldn’t sync to Google Tasks"));
    }
  },

  startTaskDrag: (payload, x, y) => {
    if (payload.done) return;
    set({ drag: { payload, x, y, x0: x, y0: y, active: false } });
  },
  startEventDrag: (item, clientY, x, y, rectTop) => {
    const px = pxPerHour(get().density);
    const grab = yToMinRaw(clientY, rectTop, px) - item.start;
    set({ eventDrag: { id: item.id, dur: item.end - item.start, title: item.title, cat: item.cat, grab, x, y, x0: x, y0: y, active: false } });
  },
  startResize: (item, edge, rectTop) => {
    opSnap = { events: get().events, tasks: get().tasks };
    set({ resize: { id: item.id, edge, rectTop } });
  },
  startSelDrag: (di, clientY, rectTop) => set({ selDrag: { di, y0: clientY, curY: clientY, rectTop } }),
  setSelCurY: (y) => set((s) => (s.selDrag ? { selDrag: { ...s.selDrag, curY: y } } : {})),
  setInteraction: (partial) => set(partial as Partial<AppState>),

  gotoToday: () => {
    set({ viewMonday: defaultWeekMonday() });
    get().loadCalendar();
  },
  prevWeek: () => {
    set((s) => ({ viewMonday: addDays(s.viewMonday, -7) }));
    get().loadCalendar();
  },
  nextWeek: () => {
    set((s) => ({ viewMonday: addDays(s.viewMonday, 7) }));
    get().loadCalendar();
  },
  shareAvailability: () => get().setToast("3 open slots copied — paste into any email"),
  setAccent: (a) => set({ accent: a }),
  setDensity: (d) => set({ density: d }),
  setAccount: (email) => set({ account: email }),
  signOut: () => {
    const done = () => {
      set({ account: null });
      if (isTauri) location.reload();
    };
    api.signOut().then(done, done);
  },
    }),
    {
      name: "cadence-settings",
      storage: createJSONStorage(() => (typeof localStorage !== "undefined" ? localStorage : NOOP_STORAGE)),
      partialize: (s) => ({
        accent: s.accent,
        density: s.density,
        showEmail: s.showEmail,
        sidebarHidden: s.sidebarHidden,
        archivedShown: s.archivedShown,
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
  return { id: d.id, date: dateKey(s), start, end, title: d.title || "(no title)", cat: "work" };
}

function dtoToTask(d: TaskDto): Task {
  return {
    id: d.id,
    title: d.title,
    project: d.listTitle,
    cat: catFromProject(d.listTitle || d.title),
    est: 30,
    status: d.status,
    due: d.due,
    completed: d.completed ? fmtCompleted(d.completed) : null,
    source: "gtasks",
    listId: d.listId,
  };
}

/** Create a just-added local task in Google Tasks, then swap in the real id. */
function pushNewTask(localId: string, title: string, due: string | null) {
  const s = useApp.getState();
  if (!isTauri || !s.account) return;
  api
    .createTask("@default", title, due)
    .then((dto) => {
      useApp.setState((st) => ({ tasks: st.tasks.map((t) => (t.id === localId ? { ...t, id: dto.id, listId: dto.listId } : t)) }));
    })
    .catch(() => {});
}

// Snapshot taken at the start of a resize gesture, restored for undo.
let opSnap: UndoSnapshot | null = null;
export const getOpSnap = () => opSnap;
export const clearOpSnap = () => {
  opSnap = null;
};

export { fmtDur, usePointer };
