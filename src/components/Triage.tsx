import { useEffect, useMemo } from "react";
import { ACCENT_FG, C, CATS } from "../theme";
import { fmtDur, fmtTime, overdueLabel } from "../lib/format";
import { diffDays } from "../lib/dates";
import { openSlots } from "../lib/slots";
import { useApp } from "../store/app";
import { overlay } from "./overlay";

export function Triage() {
  const accent = useApp((s) => s.accent);
  const ids = useApp((s) => s.triageIds);
  const index = useApp((s) => s.triageIndex);
  const today = useApp((s) => s.today);
  const now = useApp((s) => s.now);
  const events = useApp((s) => s.events);
  const tasks = useApp((s) => s.tasks);
  const placeTask = useApp((s) => s.placeTask);
  const toggleTask = useApp((s) => s.toggleTask);
  const triageNext = useApp((s) => s.triageNext);
  const exitTriage = useApp((s) => s.exitTriage);

  const taskId = ids[index];
  const task = tasks.find((t) => t.id === taskId);

  // Open slots today, around everything already scheduled, from now on.
  const slots = useMemo(() => {
    if (!task) return [];
    const busy = [
      ...events.filter((e) => e.date === today).map((e) => ({ start: e.start, end: e.end })),
      ...tasks.filter((t) => t.block && t.block.date === today).map((t) => ({ start: t.block!.start, end: t.block!.end })),
    ];
    return openSlots(busy, now, task.est, 3);
  }, [task, events, tasks, today, now]);

  // Skip past tasks that vanished (deleted / already handled).
  useEffect(() => {
    if (ids.length && !task) triageNext();
  }, [ids, task, triageNext]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = (e.key || "").toLowerCase();
      if (k === "escape") {
        e.preventDefault();
        exitTriage();
      } else if (k === "s") {
        e.preventDefault();
        triageNext();
      } else if (k === "c" || k === "x") {
        e.preventDefault();
        if (task) toggleTask(task.id);
        triageNext();
      } else if (k === "enter" && slots[0] != null && task) {
        e.preventDefault();
        placeTask(task.id, today, slots[0]);
        triageNext();
      } else if (/^[1-3]$/.test(k)) {
        const i = parseInt(k) - 1;
        if (slots[i] != null && task) {
          e.preventDefault();
          placeTask(task.id, today, slots[i]);
          triageNext();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [task, slots, today, placeTask, toggleTask, triageNext, exitTriage]);

  if (!task) return null;
  const c = CATS[task.cat] || CATS.work;
  const overdueDays = task.due ? diffDays(today, task.due) : 0;

  const key = (label: string) => (
    <span style={{ fontSize: 11, fontWeight: 600, color: C.text3, background: C.rowHover, border: "1px solid rgba(255,255,255,0.12)", borderBottomWidth: 2, borderRadius: 5, padding: "1px 6px" }}>{label}</span>
  );

  return (
    <div onClick={exitTriage} style={overlay("14vh")}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 520, maxWidth: "92vw", background: C.modalBg, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, boxShadow: "0 30px 90px rgba(0,0,0,0.6)", overflow: "hidden", animation: "rise .16s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: accent }}>Triage</span>
          <span style={{ fontSize: 12, color: C.textMute2 }}>{index + 1} of {ids.length}</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.textFaint2 }}>esc to exit</span>
        </div>

        <div style={{ padding: "22px 20px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: c.dot, flex: "none" }} />
            <span style={{ fontSize: 21, fontWeight: 700, color: C.text }}>{task.title}</span>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8, marginLeft: 20, fontSize: 12.5, color: C.textMute }}>
            <span>{task.project || "No list"}</span>
            <span>·</span>
            <span>{fmtDur(task.est)}</span>
            {overdueDays > 0 && (
              <>
                <span>·</span>
                <span style={{ color: C.overdue }}>{overdueLabel(overdueDays)}</span>
              </>
            )}
          </div>
        </div>

        <div style={{ padding: "14px 20px 18px" }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: C.textFaint2, marginBottom: 10 }}>Give it a slot today</div>
          {slots.length === 0 ? (
            <div style={{ fontSize: 13, color: C.textMute2, padding: "8px 0" }}>No open slots left today — skip, or drag it onto another day.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {slots.map((st, i) => (
                <button
                  key={st}
                  onClick={() => { placeTask(task.id, today, st); triageNext(); }}
                  style={{ display: "flex", alignItems: "center", gap: 12, background: i === 0 ? "rgba(255,255,255,0.06)" : "transparent", border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", cursor: "pointer", textAlign: "left" }}
                >
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: accent, color: ACCENT_FG, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 14, color: C.text2 }}>{fmtTime(st)} – {fmtTime(st + task.est)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 18px", background: C.modalFooterBg, borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.textMute2 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>{key("1")}–{key("3")} pick</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>{key("↵")} first</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>{key("S")} skip</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>{key("C")} complete</span>
        </div>
      </div>
    </div>
  );
}
