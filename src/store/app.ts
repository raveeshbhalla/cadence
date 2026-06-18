import { create } from "zustand";
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
import { DEFAULT_ACCENT, NOW_MIN, TODAY_INDEX, pxPerHour } from "../theme";
import { SEED_EVENTS, SEED_TASKS } from "../data/seed";
import { dayWd, fmtDur, fmtTime, isPast, nowLabel, yToMinRaw } from "../lib/format";
import { parseCapture } from "../lib/parse";
import { usePointer } from "./pointer";

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export interface Settings {
  accent: string;
  density: Density;
  showEmail: boolean;
}

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
  now: number;

  // chrome
  sidebarHidden: boolean;
  archivedShown: boolean;
  hidden: Set<CategoryKey>;

  // modals
  modal: ModalKind;
  captureText: string;
  captureContext: CaptureContext | null;
  paletteQuery: string;

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

  openCapture: () => void;
  openPalette: () => void;
  closeModal: () => void;
  togglePalette: () => void;
  setCaptureText: (t: string) => void;
  setPaletteQuery: (q: string) => void;
  confirmCapture: () => void;

  toggleSidebar: () => void;
  toggleArchived: () => void;
  toggleEmailSource: () => void;
  toggleCal: (cat: CategoryKey) => void;

  toggleTask: (id: string) => void;
  captureScheduled: (di: number, start: number, dur: number, title: string, cat: CategoryKey, project: string) => void;
  placeTask: (taskId: string, di: number, start: number) => void;
  clearCompleted: () => void;

  // drag lifecycle
  startTaskDrag: (payload: DragPayload, x: number, y: number) => void;
  startEventDrag: (item: GridLike, clientY: number, x: number, y: number, rectTop: number) => void;
  startResize: (item: { id: string }, edge: "top" | "bottom", rectTop: number) => void;
  startSelDrag: (di: number, clientY: number, rectTop: number) => void;
  setSelCurY: (y: number) => void;
  setInteraction: (partial: Partial<AppState>) => void;

  // demo stubs
  gotoToday: () => void;
  prevWeek: () => void;
  nextWeek: () => void;
  shareAvailability: () => void;
  setAccent: (a: string) => void;
  setAccount: (email: string | null) => void;
}

export const useApp = create<AppState>((set, get) => ({
  accent: DEFAULT_ACCENT,
  density: "cozy",
  showEmail: true,

  account: null,

  events: SEED_EVENTS,
  tasks: SEED_TASKS,
  now: NOW_MIN,

  sidebarHidden: false,
  archivedShown: false,
  hidden: new Set(),

  modal: null,
  captureText: "",
  captureContext: null,
  paletteQuery: "",

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

  openCapture: () => set({ modal: "capture", captureText: "", captureContext: null }),
  openPalette: () => set({ modal: "palette", paletteQuery: "" }),
  closeModal: () => set({ modal: null, captureContext: null }),
  togglePalette: () => set((s) => ({ modal: s.modal === "palette" ? null : "palette", paletteQuery: "" })),
  setCaptureText: (t) => set({ captureText: t }),
  setPaletteQuery: (q) => set({ paletteQuery: q }),

  confirmCapture: () => {
    const s = get();
    const ctx = s.captureContext;
    const p = parseCapture(s.captureText);
    if (ctx && ctx.asBlock) {
      s.captureScheduled(ctx.di, ctx.start, ctx.end - ctx.start, p.title || "Focus block", p.cat || "work", p.project || "");
      s.closeModal();
      return;
    }
    if (!p.title) {
      s.closeModal();
      return;
    }
    if (p.dayIdx != null && p.dayIdx < TODAY_INDEX) {
      s.setToast("Can’t add to a past day");
      return;
    }
    if (p.time != null) {
      const di = p.dayIdx != null ? p.dayIdx : TODAY_INDEX;
      if (isPast(di, p.time, s.now)) {
        s.setToast("Can’t schedule in the past");
        return;
      }
      s.captureScheduled(di, p.time, p.est || 30, p.title, p.cat || "work", p.project || "");
    } else {
      const due = p.dayIdx != null ? p.dayIdx - TODAY_INDEX : null;
      const id = "n" + Date.now();
      const tasks = s.tasks.concat([
        { id, title: p.title, project: p.project || "", cat: p.cat || "work", est: p.est || 30, status: "needsAction", due, completed: null, source: "gtasks" },
      ]);
      s.commit("Added “" + p.title + "” · " + (p.dayLabel || "Inbox"), { tasks });
    }
    s.closeModal();
  },

  // Capture → a brand-new scheduled task (one shared record on grid + rail).
  captureScheduled: (di, start, dur, title, cat, project) => {
    const s = get();
    if (isPast(di, start, s.now)) {
      s.setToast("Can’t schedule in the past");
      return;
    }
    const id = "n" + Date.now() + Math.floor(Math.random() * 99);
    const tasks = s.tasks.concat([
      { id, title, project, cat: cat || "work", est: dur, status: "needsAction", due: di - TODAY_INDEX, completed: null, source: "gtasks", scheduled: true, block: { day: di, start, end: start + dur } },
    ]);
    s.commit("Added “" + title + "” · " + dayWd(di) + " " + fmtTime(start), { tasks });
  },

  // Drag a rail task onto the grid → schedule it (or reschedule if already placed).
  placeTask: (taskId, di, start) => {
    const s = get();
    const t = s.tasks.find((x) => x.id === taskId);
    if (!t) return;
    if (isPast(di, start, s.now)) {
      s.setToast("Can’t schedule in the past");
      return;
    }
    const dur = t.block ? t.block.end - t.block.start : t.est;
    const wasScheduled = !!t.block;
    const tasks = s.tasks.map((x) => (x.id === taskId ? { ...x, scheduled: true, block: { day: di, start, end: start + dur } } : x));
    const verb = wasScheduled ? "Rescheduled “" : "Added “";
    s.commit(verb + t.title + "” · " + dayWd(di) + " " + fmtTime(start), { tasks });
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

  // The single completion path — flips a task's status wherever it's shown.
  // The grid block (if any) re-renders done/dimmed straight from the status.
  toggleTask: (id) => {
    const s = get();
    const t = s.tasks.find((x) => x.id === id);
    if (!t) return;
    const completing = t.status !== "completed";
    const tasks = s.tasks.map((x) =>
      x.id === id ? ({ ...x, status: completing ? "completed" : "needsAction", completed: completing ? nowLabel(s.now) : null } as Task) : x
    );
    set({ tasks });
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

  gotoToday: () => get().setToast("Showing this week"),
  prevWeek: () => get().setToast("Previous week (demo week is fixed)"),
  nextWeek: () => get().setToast("Next week (demo week is fixed)"),
  shareAvailability: () => get().setToast("3 open slots copied — paste into any email"),
  setAccent: (a) => set({ accent: a }),
  setAccount: (email) => set({ account: email }),
}));

// Snapshot taken at the start of a resize gesture, restored for undo.
let opSnap: UndoSnapshot | null = null;
export const getOpSnap = () => opSnap;
export const clearOpSnap = () => {
  opSnap = null;
};

export { fmtDur, usePointer };
