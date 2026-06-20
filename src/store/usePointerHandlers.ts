import { useEffect } from "react";
import { END_HOUR, START_HOUR, pxPerHour } from "../theme";
import { fmtTime, isPast, yToMin, yToMinRaw } from "../lib/format";
import { weekdayShort } from "../lib/dates";
import { isRailMoveKey, railDueForKey, railMoveLabel } from "../lib/railDrop";
import type { AppState } from "./app";
import type { DropTarget } from "../types";
import { clearOpSnap, displayedDays, getOpSnap, useApp } from "./app";
import { usePointer } from "./pointer";

const THRESH = 5;

interface Slot {
  start: number;
  end: number;
}

/** Compute the new {start,end} for a resize drag of `slot`. */
function resizeSlot(slot: Slot, edge: "top" | "bottom", m: number): Slot {
  if (edge === "bottom") return { start: slot.start, end: Math.min(END_HOUR * 60, Math.max(slot.start + 15, m)) };
  return { start: Math.max(START_HOUR * 60, Math.min(slot.end - 15, m)), end: slot.end };
}

function colAt(x: number, y: number): { di: number; top: number } | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const col = el && el.closest ? (el.closest("[data-daycol]") as HTMLElement | null) : null;
  if (!col) return null;
  const di = parseInt(col.getAttribute("data-daycol") || "", 10);
  if (Number.isNaN(di)) return null;
  return { di, top: col.getBoundingClientRect().top };
}

function railDropAt(x: number, y: number, today: string): AppState["railDropTarget"] {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const target = el && el.closest ? (el.closest("[data-rail-drop]") as HTMLElement | null) : null;
  const key = target?.getAttribute("data-rail-drop") || "";
  if (!key) return null;
  if (isRailMoveKey(key)) {
    const due = railDueForKey(key, today);
    return { key, label: railMoveLabel(key), valid: due !== undefined };
  }
  const label = target?.getAttribute("data-rail-label") || key;
  return { key, label, valid: false };
}

function sameTarget(a: DropTarget | null, b: DropTarget | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.di === b.di && a.start === b.start && a.dur === b.dur && a.valid === b.valid && a.cat === b.cat;
}

function sameRailTarget(a: AppState["railDropTarget"], b: AppState["railDropTarget"]): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.key === b.key && a.valid === b.valid && a.label === b.label;
}

/** Attaches the document-level pointer + key listeners once, near the app root. */
export function usePointerHandlers() {
  useEffect(() => {
    let goPrefixTimer: ReturnType<typeof setTimeout> | null = null;
    const clearGoPrefix = () => {
      if (goPrefixTimer) clearTimeout(goPrefixTimer);
      goPrefixTimer = null;
    };

    const onMove = (e: PointerEvent) => {
      const s = useApp.getState();
      const px = pxPerHour(s.density);
      const week = displayedDays(s);

      // ── resize (task block or meeting) ──
      const rz = s.resize;
      if (rz) {
        const m = yToMinRaw(e.clientY, rz.rectTop, px);
        const t = s.tasks.find((x) => x.id === rz.id && x.block);
        if (t && t.block) {
          const nb = resizeSlot(t.block, rz.edge, m);
          if (nb.start !== t.block.start || nb.end !== t.block.end) {
            const tasks = s.tasks.map((x) => (x.id === rz.id && x.block ? { ...x, block: { date: x.block.date, ...nb } } : x));
            s.setInteraction({ tasks });
          }
        } else {
          const ev = s.events.find((x) => x.id === rz.id);
          if (ev) {
            const ns = resizeSlot(ev, rz.edge, m);
            if (ns.start !== ev.start || ns.end !== ev.end) {
              const events = s.events.map((x) => (x.id === rz.id ? { ...x, ...ns } : x));
              s.setInteraction({ events });
            }
          }
        }
        return;
      }

      // ── move an existing grid item ──
      const ed = s.eventDrag;
      if (ed) {
        usePointer.getState().set(e.clientX, e.clientY);
        const active = ed.active || Math.hypot(e.clientX - ed.x0, e.clientY - ed.y0) > THRESH;
        let target: DropTarget | null = null;
        if (active) {
          const c = colAt(e.clientX, e.clientY);
          if (c && week[c.di]) {
            let st = yToMinRaw(e.clientY, c.top, px) - ed.grab;
            st = Math.round(st / 15) * 15;
            st = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - ed.dur, st));
            target = { di: c.di, start: st, dur: ed.dur, cat: ed.cat, valid: !isPast(week[c.di], st, s.today, s.now) };
          }
        }
        const patch: Partial<AppState> = {};
        if (active !== ed.active) patch.eventDrag = { ...ed, active };
        if (!sameTarget(target, s.dropTarget)) patch.dropTarget = target;
        if (Object.keys(patch).length) s.setInteraction(patch);
        return;
      }

      // ── drag a rail task onto the grid ──
      const d = s.drag;
      if (d) {
        usePointer.getState().set(e.clientX, e.clientY);
        const active = d.active || Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > THRESH;
        let target: DropTarget | null = null;
        let railTarget: AppState["railDropTarget"] = null;
        if (active) {
          const c = colAt(e.clientX, e.clientY);
          if (c && week[c.di]) {
            const st = yToMin(e.clientY, c.top, px);
            target = { di: c.di, start: st, dur: d.payload.est, cat: d.payload.cat, valid: !isPast(week[c.di], st, s.today, s.now) };
          } else {
            railTarget = railDropAt(e.clientX, e.clientY, s.today);
          }
        }
        const patch: Partial<AppState> = {};
        if (active !== d.active) patch.drag = { ...d, active };
        if (!sameTarget(target, s.dropTarget)) patch.dropTarget = target;
        if (!sameRailTarget(railTarget, s.railDropTarget)) patch.railDropTarget = railTarget;
        if (Object.keys(patch).length) s.setInteraction(patch);
        return;
      }

      // ── drag-select on an empty stretch ──
      if (s.selDrag) s.setSelCurY(e.clientY);
    };

    const onUp = (e: PointerEvent) => {
      const s = useApp.getState();
      const px = pxPerHour(s.density);
      const week = displayedDays(s);

      // resize commit
      if (s.resize) {
        const rid = s.resize.id;
        const snap = getOpSnap();
        clearOpSnap();
        s.setInteraction({ resize: null });
        useApp.getState().commitResizeTime(rid, snap);
        return;
      }

      // move-grid-item commit
      const ed = s.eventDrag;
      if (ed) {
        if (ed.active) {
          const c = colAt(e.clientX, e.clientY);
          if (c && week[c.di]) {
            const date = week[c.di];
            let start = yToMinRaw(e.clientY, c.top, px) - ed.grab;
            start = Math.round(start / 15) * 15;
            start = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - ed.dur, start));
            if (isPast(date, start, s.today, s.now)) {
              s.setInteraction({ eventDrag: null, dropTarget: null });
              s.setToast("Can’t move to the past");
              return;
            }
            const label = "Moved “" + ed.title + "” to " + weekdayShort(date) + " " + fmtTime(start);
            const t = s.tasks.find((x) => x.id === ed.id && x.block);
            if (t) {
              // Moving a block also moves the task's due date to that day.
              const tasks = s.tasks.map((x) => (x.id === ed.id && x.block ? { ...x, due: date, block: { date, start, end: start + ed.dur } } : x));
              s.commit(label, { tasks, eventDrag: null, dropTarget: null });
              useApp.getState().syncTaskDue(ed.id);
              useApp.getState().syncTaskTime(ed.id);
            } else {
              const events = s.events.map((x) => (x.id === ed.id ? { ...x, date, start, end: start + ed.dur } : x));
              s.commit(label, { events, eventDrag: null, dropTarget: null });
            }
            return;
          }
        } else if (s.tasks.some((t) => t.id === ed.id && t.block)) {
          // a click (no drag) on a task block → open its editor
          s.openEditor(ed.id);
        } else {
          // a click on a meeting → open its details
          s.openEventDetails(ed.id);
        }
        s.setInteraction({ eventDrag: null, dropTarget: null });
        return;
      }

      // rail-task drop → schedule on the grid or move to a rail date bucket
      const d = s.drag;
      if (d) {
        if (d.active) {
          const c = colAt(e.clientX, e.clientY);
          if (c && week[c.di]) {
            const start = yToMin(e.clientY, c.top, px);
            s.setInteraction({ drag: null, dropTarget: null, railDropTarget: null });
            if (d.payload.source === "allDayEvent") s.moveAllDayEventToTime(d.payload.id, week[c.di], start, d.payload.est);
            else s.placeTask(d.payload.id, week[c.di], start);
            return;
          }
          const railTarget = railDropAt(e.clientX, e.clientY, s.today);
          if (railTarget) {
            s.setInteraction({ drag: null, dropTarget: null, railDropTarget: null });
            if (d.payload.source === "allDayEvent") s.setToast("Drop all-day events onto the calendar");
            else if (isRailMoveKey(railTarget.key) && railTarget.valid) s.moveTaskToRail(d.payload.id, railTarget.key);
            else s.setToast("Can’t move tasks to " + railTarget.label);
            return;
          }
        } else if (d.payload.source !== "allDayEvent") {
          // a click (no drag) on a rail row → open its editor
          s.openEditor(d.payload.id);
        }
        s.setInteraction({ drag: null, dropTarget: null, railDropTarget: null });
        return;
      }

      // drag-select → open capture pre-filled
      const sel = s.selDrag;
      if (sel) {
        if (Math.abs(sel.curY - sel.y0) > 6 && week[sel.di]) {
          const date = week[sel.di];
          const a = yToMin(Math.min(sel.y0, sel.curY), sel.rectTop, px);
          let b = yToMin(Math.max(sel.y0, sel.curY), sel.rectTop, px);
          if (b - a < 15) b = a + 30;
          if (isPast(date, a, s.today, s.now)) {
            s.setInteraction({ selDrag: null });
            s.setToast("Can’t schedule in the past");
          } else if (s.availabilityMode) {
            // In availability mode, a drag collects an open slot (no event created).
            s.setInteraction({ selDrag: null });
            s.addAvailabilitySlot(date, a, b);
          } else {
            s.setInteraction({ selDrag: null, modal: "capture", captureText: "", captureAsTask: true, captureEventDate: date, captureEventStart: a, captureEventDur: b - a, captureEventGuests: "", captureContext: { asBlock: true, date, start: a, end: b } });
          }
        } else {
          s.setInteraction({ selDrag: null });
        }
      }
    };

    const onKey = (e: KeyboardEvent) => {
      const s = useApp.getState();
      if (s.triageMode) return; // Triage handles its own keys
      const k = (e.key || "").toLowerCase();
      const meta = e.metaKey || e.ctrlKey;
      if (s.availabilityMode) {
        if (meta && k === "c") {
          e.preventDefault();
          s.copyAvailability();
          return;
        }
        if (!meta && !e.altKey && !e.shiftKey && s.availabilityPrompt === "copied") {
          if (k === "y") {
            e.preventDefault();
            s.blockAvailability();
            return;
          }
          if (k === "n") {
            e.preventDefault();
            s.dismissAvailabilityPrompt();
            return;
          }
        }
      }
      if (meta && k === "k") {
        e.preventDefault();
        s.togglePalette();
        return;
      }
      if (meta && k === "n") {
        e.preventDefault();
        s.openCapture();
        return;
      }
      if (meta && k === "t") {
        e.preventDefault();
        s.startTriage();
        return;
      }
      if (meta && k === "z") {
        e.preventDefault();
        s.undo();
        return;
      }
      if (meta && k === "j") {
        e.preventDefault();
        s.joinNextMeeting();
        return;
      }
      if (meta && k === "f") {
        e.preventDefault();
        s.openSearch();
        return;
      }
      if (k === "escape") {
        if (s.modal) s.closeModal();
        else if (s.editorId) s.closeEditor();
        else if (s.eventDetailsId) s.closeEventDetails();
        else if (s.availabilityMode) s.exitAvailability();
        return;
      }

      // Single-key navigation — only when not typing or in another surface.
      if (meta || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (s.modal || s.availabilityMode || s.editorId || (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable))) {
        clearGoPrefix();
        return;
      }

      if (goPrefixTimer) {
        e.preventDefault();
        clearGoPrefix();
        if (k === "d") s.setView("day");
        else if (k === "w") s.setView("week");
        else if (k === "f") s.setView("focus");
        else if (k === "g" && s.view !== "focus") s.openGoto();
        return;
      }

      if (s.view === "focus") {
        if (k === "g") {
          e.preventDefault();
          goPrefixTimer = setTimeout(() => {
            goPrefixTimer = null;
          }, 650);
        } else if (k === "?") s.openShortcuts();
        return;
      }

      if (k === "t") s.gotoToday();
      else if (k === "[") s.prevWeek();
      else if (k === "]") s.nextWeek();
      else if (k === "g") {
        e.preventDefault();
        goPrefixTimer = setTimeout(() => {
          useApp.getState().openGoto();
          goPrefixTimer = null;
        }, 650);
      }
      else if (k === "?") s.openShortcuts();
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);
    return () => {
      clearGoPrefix();
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, []);
}
