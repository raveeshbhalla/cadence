import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { ACCENT_FG, C, CATS, END_HOUR, START_HOUR } from "../theme";
import { fmtDur, fmtTime, overdueLabel } from "../lib/format";
import { dayOfMonth, diffDays, monthShort, weekdayShort } from "../lib/dates";
import { parseWhen } from "../lib/parse";
import { useApp } from "../store/app";
import { Hoverable } from "./Hoverable";
import { overlay } from "./overlay";

export function Triage() {
  const accent = useApp((s) => s.accent);
  const ids = useApp((s) => s.triageIds);
  const index = useApp((s) => s.triageIndex);
  const today = useApp((s) => s.today);
  const now = useApp((s) => s.now);
  const tasks = useApp((s) => s.tasks);
  const placeTask = useApp((s) => s.placeTask);
  const toggleTask = useApp((s) => s.toggleTask);
  const triageNext = useApp((s) => s.triageNext);
  const exitTriage = useApp((s) => s.exitTriage);

  const taskId = ids[index];
  const task = tasks.find((t) => t.id === taskId);
  const [when, setWhen] = useState("");

  // Reset the input when we advance to a new task.
  useEffect(() => setWhen(""), [taskId]);

  // Skip past tasks that vanished (deleted / already handled).
  useEffect(() => {
    if (ids.length && !task) triageNext();
  }, [ids, task, triageNext]);

  const parsed = useMemo(() => {
    const p = parseWhen(when, now, today);
    if (!p) return null;
    const dur = Math.max(15, Math.min(p.dur, (END_HOUR - START_HOUR) * 60));
    const start = Math.max(START_HOUR * 60, Math.min(p.start, END_HOUR * 60 - dur));
    return { date: p.date, start, dur };
  }, [when, now, today]);

  const schedule = () => {
    if (!task || !parsed) return;
    placeTask(task.id, parsed.date, parsed.start, parsed.dur);
    triageNext();
  };
  const complete = () => {
    if (task) toggleTask(task.id);
    triageNext();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      exitTriage();
      return;
    }
    if (e.key !== "Enter") return;
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      complete();
      return;
    }
    if ((e.target as HTMLElement).tagName === "INPUT") {
      e.preventDefault();
      schedule();
    }
  };

  if (!task) return null;
  const c = CATS[task.cat] || CATS.work;
  const overdueDays = task.due ? diffDays(today, task.due) : 0;
  const isEmail = task.source === "gmail" || task.cat === "email";

  const dateLabel = (date: string) => {
    const delta = diffDays(date, today);
    if (delta === 0) return "Today";
    if (delta === 1) return "Tomorrow";
    return `${weekdayShort(date)} ${monthShort(date)} ${dayOfMonth(date)}`;
  };

  return (
    <div onClick={exitTriage} style={overlay("14vh")}>
      <div onClick={(e) => e.stopPropagation()} onKeyDown={onKey} style={{ width: 520, maxWidth: "92vw", background: C.modalBg, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, boxShadow: "0 30px 90px rgba(0,0,0,0.6)", overflow: "hidden", animation: "rise .16s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: accent }}>Triage</span>
          <span style={{ fontSize: 12, color: C.textMute2 }}>{index + 1} of {ids.length}</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.textFaint2 }}>esc to exit</span>
        </div>

        <div style={{ padding: "22px 20px 6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: c.dot, flex: "none" }} />
            <span style={{ fontSize: 21, fontWeight: 700, color: C.text }}>{task.title}</span>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8, marginLeft: 20, fontSize: 12.5, color: C.textMute }}>
            <span>{isEmail ? "Email · " + (task.meta || "needs reply") : task.project || "No list"}</span>
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

        <div style={{ padding: "14px 20px 6px" }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: C.textFaint2, marginBottom: 8 }}>When?</div>
          <input
            autoFocus
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            placeholder="8pm · tomorrow 8pm · next week 2pm · fri 8-9pm"
            style={{ width: "100%", background: "none", border: `1px solid ${C.border}`, borderRadius: 9, outline: "none", color: C.text, fontSize: 16, padding: "11px 14px" }}
          />
          <div style={{ minHeight: 20, marginTop: 8, fontSize: 13, color: parsed ? accent : C.textFaint2 }}>
            {parsed ? `${dateLabel(parsed.date)} · ${fmtTime(parsed.start)} – ${fmtTime(parsed.start + parsed.dur)}  ·  ${fmtDur(parsed.dur)}` : when.trim() ? "Type a date and time, e.g. tomorrow 8pm" : "Type a date and time"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", background: C.modalFooterBg, borderTop: `1px solid ${C.border}` }}>
          <Hoverable as="button" onClick={triageNext} style={{ background: C.rowHover, border: "1px solid rgba(255,255,255,0.08)", color: C.textMute, fontSize: 12.5, borderRadius: 8, padding: "7px 12px", cursor: "pointer" }} hover={{ background: "#222630", color: "#fff" }}>
            Skip
          </Hoverable>
          <Hoverable as="button" onClick={complete} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "1px solid rgba(87,199,126,0.3)", color: "#57C77E", fontSize: 12.5, borderRadius: 8, padding: "7px 12px", cursor: "pointer" }} hover={{ background: "rgba(87,199,126,0.12)" }}>
            Complete <span className="keycap">⌘↵</span>
          </Hoverable>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={schedule} disabled={!parsed} style={{ display: "flex", alignItems: "center", gap: 8, background: parsed ? accent : C.rowHover, color: parsed ? ACCENT_FG : C.textFaint2, fontWeight: 600, fontSize: 13, border: "none", borderRadius: 8, padding: "7px 16px", cursor: parsed ? "pointer" : "default" }}>
              Schedule <span className="keycap">↵</span>
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
