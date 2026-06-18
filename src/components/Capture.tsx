import { useMemo, type KeyboardEvent } from "react";
import { ACCENT_FG, C, CATS } from "../theme";
import { fmtDur, fmtTime } from "../lib/format";
import { weekdayShort } from "../lib/dates";
import { parseCapture } from "../lib/parse";
import { useApp } from "../store/app";
import { overlay } from "./overlay";

interface Chip {
  label: string;
  bg: string;
  col: string;
}

function Seg({ label, active, accent, onClick }: { label: string; active: boolean; accent: string; onClick: () => void }) {
  return (
    <span onClick={onClick} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, cursor: "pointer", color: active ? ACCENT_FG : C.textFaint, fontWeight: active ? 600 : 400, background: active ? accent : "transparent" }}>
      {label}
    </span>
  );
}

export function Capture() {
  const accent = useApp((s) => s.accent);
  const captureText = useApp((s) => s.captureText);
  const ctx = useApp((s) => s.captureContext);
  const setCaptureText = useApp((s) => s.setCaptureText);
  const confirmCapture = useApp((s) => s.confirmCapture);
  const closeModal = useApp((s) => s.closeModal);
  const today = useApp((s) => s.today);
  const captureAsTask = useApp((s) => s.captureAsTask);
  const setCaptureAsTask = useApp((s) => s.setCaptureAsTask);

  const isBlock = !!(ctx && ctx.asBlock);
  const asTask = isBlock ? captureAsTask || parseCapture(captureText, today).checkbox : true;

  const chips = useMemo<Chip[]>(() => {
    const p = parseCapture(captureText, today);
    const out: Chip[] = [];
    if (ctx && ctx.asBlock) {
      out.push({ label: p.title || (asTask ? "Untitled task" : "Untitled event"), bg: "rgba(255,255,255,0.07)", col: C.text2 });
      out.push({ label: weekdayShort(ctx.date) + " " + fmtTime(ctx.start) + "–" + fmtTime(ctx.end), bg: "rgba(255,122,69,0.14)", col: accent });
      out.push(asTask ? { label: "Task", bg: "rgba(156,140,255,0.16)", col: "#D3CAFF" } : { label: "Event", bg: "rgba(91,155,255,0.16)", col: "#C6DBFF" });
      if (p.project) {
        const c = CATS[p.cat || "work"];
        out.push({ label: "#" + p.project, bg: c.fill, col: c.text });
      }
      return out;
    }
    if (p.title) out.push({ label: p.title, bg: "rgba(255,255,255,0.07)", col: C.text2 });
    if (p.project) {
      const c = CATS[p.cat || "work"];
      out.push({ label: "#" + p.project, bg: c.fill, col: c.text });
    }
    out.push({ label: "~" + fmtDur(p.est || 30), bg: "rgba(91,155,255,0.13)", col: "#C6DBFF" });
    if (p.time != null) out.push({ label: (p.dayLabel || "Today") + " " + fmtTime(p.time), bg: "rgba(255,122,69,0.14)", col: accent });
    else if (p.dayLabel) out.push({ label: p.dayLabel, bg: "rgba(63,182,164,0.13)", col: "#BDEBE2" });
    else out.push({ label: "Inbox", bg: "rgba(255,255,255,0.05)", col: C.textMute2 });
    return out;
  }, [captureText, ctx, accent, today, asTask]);

  const kindLabel = isBlock ? (asTask ? "New task" : "New event") : "New task";

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmCapture();
    } else if (e.key === "Escape") closeModal();
  };

  return (
    <div onClick={closeModal} style={overlay("16vh")}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 600, maxWidth: "92vw", background: C.modalBg, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, boxShadow: "0 30px 90px rgba(0,0,0,0.6)", overflow: "hidden", animation: "rise .16s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", borderBottom: `1px solid ${C.border}` }}>
          {isBlock ? (
            <div style={{ display: "flex", gap: 3, background: C.titlebarBg, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 2 }}>
              <Seg label="Event" active={!asTask} accent={accent} onClick={() => setCaptureAsTask(false)} />
              <Seg label="Task" active={asTask} accent={accent} onClick={() => setCaptureAsTask(true)} />
            </div>
          ) : (
            <span style={{ fontSize: 11, fontWeight: 600, color: accent, background: "rgba(255,122,69,0.12)", borderRadius: 6, padding: "3px 8px" }}>{kindLabel}</span>
          )}
          {isBlock && <span style={{ fontSize: 11.5, color: C.textMute2 }}>{asTask ? "checkbox on the grid" : "·  type [ ] to make it a task"}</span>}
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.textFaint2 }}>esc to close</span>
        </div>
        <input
          autoFocus
          value={captureText}
          onChange={(e) => setCaptureText(e.target.value)}
          onKeyDown={onKey}
          placeholder={isBlock ? "Name this time…  ( [ ] makes it a task )" : "Draft Q3 deck thursday 2pm ~90m #work"}
          style={{ width: "100%", background: "none", border: "none", outline: "none", color: C.text, fontSize: 18, padding: "18px 18px 6px" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", padding: "4px 18px 14px", minHeight: 30 }}>
          {chips.map((chip, i) => (
            <span key={i} style={{ fontSize: 12, padding: "4px 9px", borderRadius: 7, background: chip.bg, color: chip.col }}>{chip.label}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", background: C.modalFooterBg, borderTop: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 11.5, color: C.textFaint }}>Live preview · refined with gpt‑5.4‑nano on add</span>
          <button onClick={confirmCapture} style={{ display: "flex", alignItems: "center", gap: 8, background: accent, color: ACCENT_FG, fontWeight: 600, fontSize: 13, border: "none", borderRadius: 8, padding: "7px 16px", cursor: "pointer" }}>
            Add <span className="keycap">↵</span>
          </button>
        </div>
      </div>
    </div>
  );
}
