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
    <button onClick={onClick} type="button" style={{ font: "inherit", border: "none", fontSize: 12, padding: "4px 12px", borderRadius: 6, cursor: "pointer", color: active ? ACCENT_FG : C.textFaint, fontWeight: active ? 600 : 400, background: active ? accent : "transparent" }}>
      {label}
    </button>
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

function guestCount(value: string): number {
  return value.split(/[,\s;]+/).filter((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.trim())).length;
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
  const captureEventDate = useApp((s) => s.captureEventDate);
  const captureEventStart = useApp((s) => s.captureEventStart);
  const captureEventDur = useApp((s) => s.captureEventDur);
  const captureEventGuests = useApp((s) => s.captureEventGuests);
  const captureSubmitting = useApp((s) => s.captureSubmitting);
  const setCaptureEventDate = useApp((s) => s.setCaptureEventDate);
  const setCaptureEventStart = useApp((s) => s.setCaptureEventStart);
  const setCaptureEventDur = useApp((s) => s.setCaptureEventDur);
  const setCaptureEventGuests = useApp((s) => s.setCaptureEventGuests);

  const isBlock = !!(ctx && ctx.asBlock);
  const parsed = parseCapture(captureText, today);
  const asTask = captureAsTask || parsed.checkbox;
  const eventDate = ctx?.date || captureEventDate || parsed.date;
  const eventStart = ctx?.start ?? captureEventStart ?? parsed.time;
  const eventDur = ctx ? ctx.end - ctx.start : captureEventDur || parsed.est || 30;
  const validGuestCount = guestCount(captureEventGuests);
  const title = (parsed.title || "").replace(/\[\s*x?\s*\]/gi, " ").replace(/\s+/g, " ").trim();
  const canAdd = !captureSubmitting && (asTask ? !!title || isBlock : !!title && !!eventDate && eventStart != null);

  const chips = useMemo<Chip[]>(() => {
    const p = parsed;
    const out: Chip[] = [];
    if (ctx && ctx.asBlock) {
      out.push({ label: weekdayShort(ctx.date) + " " + fmtTime(ctx.start) + "–" + fmtTime(ctx.end), bg: "rgba(255,122,69,0.14)", col: accent });
      out.push(asTask ? { label: "Task", bg: "rgba(156,140,255,0.16)", col: "#D3CAFF" } : { label: "Event", bg: "rgba(91,155,255,0.16)", col: "#C6DBFF" });
      if (!asTask && validGuestCount) out.push({ label: `${validGuestCount} guest${validGuestCount > 1 ? "s" : ""}`, bg: "rgba(63,182,164,0.13)", col: "#BDEBE2" });
      if (p.project) {
        const c = CATS[p.cat || "work"];
        out.push({ label: "#" + p.project, bg: c.fill, col: c.text });
      }
      return out;
    }
    if (!asTask) {
      if (eventDate && eventStart != null) out.push({ label: weekdayShort(eventDate) + " " + fmtTime(eventStart) + " · " + fmtDur(eventDur), bg: "rgba(255,122,69,0.14)", col: accent });
      else out.push({ label: "Date and time required", bg: "rgba(229,115,107,0.14)", col: C.overdue });
      if (validGuestCount) out.push({ label: `${validGuestCount} guest${validGuestCount > 1 ? "s" : ""}`, bg: "rgba(63,182,164,0.13)", col: "#BDEBE2" });
      return out;
    }
    if (p.project) {
      const c = CATS[p.cat || "work"];
      out.push({ label: "#" + p.project, bg: c.fill, col: c.text });
    }
    out.push({ label: "~" + fmtDur(p.est || 30), bg: "rgba(91,155,255,0.13)", col: "#C6DBFF" });
    if (p.time != null) out.push({ label: (p.dayLabel || "Today") + " " + fmtTime(p.time), bg: "rgba(255,122,69,0.14)", col: accent });
    else if (p.dayLabel) out.push({ label: p.dayLabel, bg: "rgba(63,182,164,0.13)", col: "#BDEBE2" });
    else out.push({ label: "No date", bg: "rgba(255,255,255,0.05)", col: C.textMute2 });
    return out;
  }, [parsed, ctx, accent, asTask, eventDate, eventStart, eventDur, validGuestCount]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmCapture();
    } else if (e.key === "Tab" && !e.shiftKey && (e.target as HTMLElement).tagName === "INPUT") {
      e.preventDefault();
      setCaptureAsTask(!asTask);
    } else if (e.key === "Escape") closeModal();
  };

  return (
    <div onClick={closeModal} style={overlay("16vh")}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 600, maxWidth: "92vw", background: C.modalBg, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, boxShadow: "0 30px 90px rgba(0,0,0,0.6)", overflow: "hidden", animation: "rise .16s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", gap: 3, background: C.titlebarBg, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 2 }}>
            <Seg label="Task" active={asTask} accent={accent} onClick={() => setCaptureAsTask(true)} />
            <Seg label="Event" active={!asTask} accent={accent} onClick={() => setCaptureAsTask(false)} />
          </div>
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.textFaint2 }}>esc to close</span>
        </div>
        <input
          className="capture-input"
          autoFocus
          value={captureText}
          onChange={(e) => setCaptureText(e.target.value)}
          onKeyDown={onKey}
          placeholder={isBlock ? (asTask ? "Name this task…" : "Name this event…") : asTask ? "Draft Q3 deck thursday 2pm ~90m #work" : "Meeting with Avi"}
          style={{ width: "100%", background: "none", border: "none", outline: "none", color: C.text, fontSize: 18, padding: "18px 18px 6px" }}
        />
        {!asTask && !isBlock && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 88px", gap: 8, padding: "6px 18px 4px" }}>
            <input className="capture-input" type="date" value={eventDate || ""} onChange={(e) => setCaptureEventDate(e.target.value)} style={{ minWidth: 0, background: C.titlebarBg, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text2, fontSize: 12.5, padding: "7px 9px", outline: "none" }} />
            <input className="capture-input" type="time" value={timeValue(eventStart)} onChange={(e) => setCaptureEventStart(parseTimeValue(e.target.value))} style={{ minWidth: 0, background: C.titlebarBg, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text2, fontSize: 12.5, padding: "7px 9px", outline: "none" }} />
            <input className="capture-input" type="number" min={15} step={15} value={eventDur} onChange={(e) => setCaptureEventDur(Number(e.target.value) || 30)} style={{ minWidth: 0, background: C.titlebarBg, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text2, fontSize: 12.5, padding: "7px 9px", outline: "none" }} />
          </div>
        )}
        {!asTask && (
          <div style={{ padding: isBlock ? "6px 18px 4px" : "4px 18px" }}>
            <input className="capture-input" value={captureEventGuests} onChange={(e) => setCaptureEventGuests(e.target.value)} placeholder="Optional guests" style={{ width: "100%", background: C.titlebarBg, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text2, fontSize: 12.5, padding: "7px 9px", outline: "none" }} />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", padding: "4px 18px 14px", minHeight: 30 }}>
          {chips.map((chip, i) => (
            <span key={i} style={{ fontSize: 12, padding: "4px 9px", borderRadius: 7, background: chip.bg, color: chip.col }}>{chip.label}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", background: C.modalFooterBg, borderTop: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 11.5, color: C.textFaint }}>{captureSubmitting ? "Adding…" : !canAdd && !asTask ? "Missing required event details" : ""}</span>
          <button disabled={!canAdd} onClick={confirmCapture} style={{ display: "flex", alignItems: "center", gap: 8, background: accent, color: ACCENT_FG, fontWeight: 600, fontSize: 13, border: "none", borderRadius: 8, padding: "7px 16px", cursor: canAdd ? "pointer" : "default", opacity: canAdd ? 1 : 0.45 }}>
            {captureSubmitting ? "Adding" : "Add"} <span className="keycap">↵</span>
          </button>
        </div>
      </div>
    </div>
  );
}
