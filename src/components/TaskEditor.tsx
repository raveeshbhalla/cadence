import { useEffect, useState, type KeyboardEvent } from "react";
import { C, CATS } from "../theme";
import { fmtDur, fmtTime } from "../lib/format";
import { weekdayShort } from "../lib/dates";
import { parseCapture } from "../lib/parse";
import { api } from "../lib/api";
import { useApp } from "../store/app";
import { Hoverable } from "./Hoverable";
import { overlay } from "./overlay";

export function TaskEditor() {
  const editorId = useApp((s) => s.editorId);
  const task = useApp((s) => s.tasks.find((t) => t.id === s.editorId));
  const updateTaskDetails = useApp((s) => s.updateTaskDetails);
  const deleteTask = useApp((s) => s.deleteTask);
  const unscheduleTask = useApp((s) => s.unscheduleTask);
  const closeEditor = useApp((s) => s.closeEditor);
  const today = useApp((s) => s.today);
  const accent = useApp((s) => s.accent);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState<number | null>(null);
  const [dur, setDur] = useState(30);
  const [dateTouched, setDateTouched] = useState(false);
  const [startTouched, setStartTouched] = useState(false);
  const [durTouched, setDurTouched] = useState(false);
  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDate(task.block?.date || task.due || "");
    setStart(task.block?.start ?? null);
    setDur(Math.max(15, task.block ? task.block.end - task.block.start : task.est || 30));
    setDateTouched(false);
    setStartTouched(false);
    setDurTouched(false);
  }, [editorId, task?.title, task?.due, task?.block?.date, task?.block?.start, task?.block?.end, task?.est]);

  if (!task) return null;
  const c = CATS[task.cat] || CATS.work;
  const parsed = parseCapture(title, today);
  const cleanTitle = parsed.title || title.trim();
  const effectiveStart = startTouched ? start : parsed.time ?? start;
  const effectiveDate = dateTouched ? date || null : parsed.date || date || (effectiveStart != null ? today : null);
  const effectiveDur = durTouched ? dur : parsed.est || dur;
  const canSave = !!cleanTitle && effectiveDur > 0;

  const commit = () => {
    if (!canSave) return;
    updateTaskDetails(task.id, cleanTitle, effectiveDate, effectiveStart, effectiveDur);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
      closeEditor();
    } else if (e.key === "Escape") closeEditor();
  };

  const block = task.block;
  const metaBits: string[] = [];
  if (task.project) metaBits.push(task.project);
  if (block) metaBits.push(weekdayShort(block.date) + " " + fmtTime(block.start) + "–" + fmtTime(block.end));
  else if (task.source === "gmail" && task.meta) metaBits.push(task.meta);
  metaBits.push(fmtDur(block ? block.end - block.start : task.est));
  const fieldStyle = {
    minWidth: 0,
    background: C.titlebarBg,
    border: `1px solid ${C.border}`,
    borderRadius: 7,
    color: C.text2,
    fontSize: 12.5,
    padding: "7px 9px",
    outline: "none",
  };

  return (
    <div onClick={closeEditor} style={overlay("18vh")}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 460, maxWidth: "92vw", background: C.modalBg, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, boxShadow: "0 30px 90px rgba(0,0,0,0.6)", overflow: "hidden", animation: "rise .16s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px 10px" }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: c.dot, flex: "none" }} />
          <span style={{ fontSize: 11.5, color: C.textMute2 }}>{metaBits.join(" · ")}</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            {task.emailThreadId && (
              <Hoverable
                as="button"
                title="Open email in Gmail"
                onClick={() => api.openUrl(`https://mail.google.com/mail/u/0/#all/${task.emailThreadId}`)}
                style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: C.textMute2, cursor: "pointer", fontSize: 12, padding: 0 }}
                hover={{ color: "#fff" }}
              >
                Open email <span style={{ fontSize: 13 }}>↗</span>
              </Hoverable>
            )}
            <span style={{ fontSize: 11, color: C.textFaint2 }}>esc to close</span>
          </div>
        </div>
        <input
          className="capture-input"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commit}
          onKeyDown={onKey}
          style={{ width: "100%", background: "none", border: "none", outline: "none", color: C.text, fontSize: 18, fontWeight: 600, padding: "0 18px 16px" }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 88px", gap: 8, padding: "0 18px 10px" }}>
          <input
            className="capture-input"
            type="date"
            value={effectiveDate || ""}
            onChange={(e) => {
              setDateTouched(true);
              setDate(e.target.value);
            }}
            style={fieldStyle}
          />
          <input
            className="capture-input"
            type="time"
            value={timeValue(effectiveStart)}
            onChange={(e) => {
              setStartTouched(true);
              setStart(parseTimeValue(e.target.value));
            }}
            style={fieldStyle}
          />
          <input
            className="capture-input"
            type="number"
            min={15}
            step={15}
            value={effectiveDur}
            onChange={(e) => {
              setDurTouched(true);
              setDur(Number(e.target.value) || 30);
            }}
            style={fieldStyle}
          />
        </div>
        <div style={{ padding: "0 18px 12px", display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          {effectiveDate ? (
            <span style={{ fontSize: 12, padding: "4px 9px", borderRadius: 7, background: "rgba(255,122,69,0.14)", color: accent }}>
              {weekdayShort(effectiveDate)}
              {effectiveStart != null ? ` ${fmtTime(effectiveStart)}` : ""}
            </span>
          ) : (
            <span style={{ fontSize: 12, padding: "4px 9px", borderRadius: 7, background: "rgba(255,255,255,0.05)", color: C.textMute2 }}>No date</span>
          )}
          <span style={{ fontSize: 12, padding: "4px 9px", borderRadius: 7, background: "rgba(91,155,255,0.13)", color: "#C6DBFF" }}>{fmtDur(effectiveDur)}</span>
          {cleanTitle !== title.trim() && <span style={{ fontSize: 12, padding: "4px 9px", borderRadius: 7, background: "rgba(255,255,255,0.05)", color: C.textMute2 }}>{cleanTitle}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", background: C.modalFooterBg, borderTop: `1px solid ${C.border}` }}>
          <Hoverable as="button" onClick={() => deleteTask(task.id)} style={{ background: "none", border: "1px solid rgba(229,115,107,0.3)", color: "#E5736B", fontSize: 12.5, fontWeight: 500, borderRadius: 8, padding: "7px 12px", cursor: "pointer" }} hover={{ background: "rgba(229,115,107,0.12)" }}>
            Delete
          </Hoverable>
          {block && (
            <Hoverable as="button" onClick={() => unscheduleTask(task.id)} style={{ background: C.rowHover, border: "1px solid rgba(255,255,255,0.08)", color: C.textMute, fontSize: 12.5, borderRadius: 8, padding: "7px 12px", cursor: "pointer" }} hover={{ background: "#222630", color: "#fff" }}>
              Unschedule
            </Hoverable>
          )}
          <span style={{ flex: 1 }} />
          <button disabled={!canSave} onClick={() => { commit(); closeEditor(); }} style={{ display: "flex", alignItems: "center", gap: 8, background: accent, color: "#1A0E07", fontWeight: 600, fontSize: 13, border: "none", borderRadius: 8, padding: "7px 18px", cursor: canSave ? "pointer" : "default", opacity: canSave ? 1 : 0.45 }}>
            Done <span className="keycap">↵</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function timeValue(minutes: number | null): string {
  if (minutes == null) return "";
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function parseTimeValue(value: string): number | null {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}
