import { useEffect } from "react";
import { END_HOUR, START_HOUR, pxPerHour } from "../theme";
import { fmtDur, fmtTime, isPast, yToMin, yToMinRaw } from "../lib/format";
import { weekDates, weekdayShort } from "../lib/dates";
import type { AppState } from "./app";
import type { DropTarget } from "../types";
import { clearOpSnap, getOpSnap, useApp } from "./app";
import { usePointer } from "./pointer";

const THRESH = 5;

interface Slot {
  start: number;
  end: number;
}

/** Resolve a grid item by id to its backing slot (task block or meeting). */
function findSlot(s: Pick<AppState, "tasks" | "events">, id: string): { title: string; start: number; end: number } | null {
  const t = s.tasks.find((x) => x.id === id && x.block);
  if (t && t.block) return { title: t.title, start: t.block.start, end: t.block.end };
  const e = s.events.find((x) => x.id === id);
  if (e) return { title: e.title, start: e.start, end: e.end };
  return null;
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

function sameTarget(a: DropTarget | null, b: DropTarget | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.di === b.di && a.start === b.start && a.dur === b.dur && a.valid === b.valid && a.cat === b.cat;
}

/** Attaches the document-level pointer + key listeners once, near the app root. */
export function usePointerHandlers() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const s = useApp.getState();
      const px = pxPerHour(s.density);
      const week = weekDates(s.viewMonday);

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
        if (active) {
          const c = colAt(e.clientX, e.clientY);
          if (c && week[c.di]) {
            const st = yToMin(e.clientY, c.top, px);
            target = { di: c.di, start: st, dur: d.payload.est, cat: d.payload.cat, valid: !isPast(week[c.di], st, s.today, s.now) };
          }
        }
        const patch: Partial<AppState> = {};
        if (active !== d.active) patch.drag = { ...d, active };
        if (!sameTarget(target, s.dropTarget)) patch.dropTarget = target;
        if (Object.keys(patch).length) s.setInteraction(patch);
        return;
      }

      // ── drag-select on an empty stretch ──
      if (s.selDrag) s.setSelCurY(e.clientY);
    };

    const onUp = (e: PointerEvent) => {
      const s = useApp.getState();
      const px = pxPerHour(s.density);
      const week = weekDates(s.viewMonday);

      // resize commit
      if (s.resize) {
        const rid = s.resize.id;
        const snap = getOpSnap();
        clearOpSnap();
        s.setInteraction({ resize: null });
        const after = findSlot(useApp.getState(), rid);
        const before = snap ? findSlot(snap, rid) : null;
        if (after && before && (before.start !== after.start || before.end !== after.end)) {
          s.commit("Resized “" + after.title + "” to " + fmtDur(after.end - after.start), {}, snap || undefined);
          if (useApp.getState().tasks.some((t) => t.id === rid && t.block)) useApp.getState().syncBlock(rid);
        }
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
              const tasks = s.tasks.map((x) => (x.id === ed.id && x.block ? { ...x, block: { date, start, end: start + ed.dur } } : x));
              s.commit(label, { tasks, eventDrag: null, dropTarget: null });
              useApp.getState().syncBlock(ed.id);
            } else {
              const events = s.events.map((x) => (x.id === ed.id ? { ...x, date, start, end: start + ed.dur } : x));
              s.commit(label, { events, eventDrag: null, dropTarget: null });
            }
            return;
          }
        } else if (s.tasks.some((t) => t.id === ed.id && t.block)) {
          // a click (no drag) on a task block → open its editor
          s.openEditor(ed.id);
        }
        s.setInteraction({ eventDrag: null, dropTarget: null });
        return;
      }

      // rail-task drop → schedule / reschedule
      const d = s.drag;
      if (d) {
        if (d.active) {
          const c = colAt(e.clientX, e.clientY);
          if (c && week[c.di]) {
            const start = yToMin(e.clientY, c.top, px);
            s.setInteraction({ drag: null, dropTarget: null });
            s.placeTask(d.payload.id, week[c.di], start);
            return;
          }
        } else {
          // a click (no drag) on a rail row → open its editor
          s.openEditor(d.payload.id);
        }
        s.setInteraction({ drag: null, dropTarget: null });
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
          } else {
            s.setInteraction({ selDrag: null, modal: "capture", captureText: "", captureContext: { asBlock: true, date, start: a, end: b } });
          }
        } else {
          s.setInteraction({ selDrag: null });
        }
      }
    };

    const onKey = (e: KeyboardEvent) => {
      const s = useApp.getState();
      const k = (e.key || "").toLowerCase();
      const meta = e.metaKey || e.ctrlKey;
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
      if (meta && k === "z") {
        e.preventDefault();
        s.undo();
        return;
      }
      if (k === "escape") {
        if (s.modal) s.closeModal();
        else if (s.editorId) s.closeEditor();
      }
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, []);
}
