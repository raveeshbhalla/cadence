import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { ACCENT_FG, C } from "../theme";
import { fmtDur, fmtTime } from "../lib/format";
import { weekdayShort } from "../lib/dates";
import { parseCapture } from "../lib/parse";
import { meetingLink } from "../lib/meeting";
import { api } from "../lib/api";
import { useApp } from "../store/app";
import { Hoverable } from "./Hoverable";
import { overlay } from "./overlay";

export function EventDetails() {
  const accent = useApp((s) => s.accent);
  const ev = useApp((s) => s.events.find((e) => e.id === s.eventDetailsId));
  const close = useApp((s) => s.closeEventDetails);
  const addBufferAfter = useApp((s) => s.addBufferAfter);
  const renameEvent = useApp((s) => s.renameEvent);
  const rescheduleEvent = useApp((s) => s.rescheduleEvent);
  const deleteEvent = useApp((s) => s.deleteEvent);
  const setEventRsvp = useApp((s) => s.setEventRsvp);
  const today = useApp((s) => s.today);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState<number | null>(null);
  const [dur, setDur] = useState(30);
  const [dateTouched, setDateTouched] = useState(false);
  const [startTouched, setStartTouched] = useState(false);
  const [durTouched, setDurTouched] = useState(false);

  useEffect(() => {
    if (!ev) return;
    setTitle(ev.title);
    setDate(ev.date);
    setStart(ev.start);
    setDur(Math.max(15, ev.end - ev.start));
    setDateTouched(false);
    setStartTouched(false);
    setDurTouched(false);
  }, [ev?.id, ev?.title, ev?.date, ev?.start, ev?.end]);

  if (!ev) return null;

  const color = ev.color || "#5B9BFF";
  const join = meetingLink(ev);
  const localTz = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "";
    }
  })();
  const tzNote = ev.timeZone && ev.timeZone !== localTz ? `Created in ${ev.timeZone} — shown in your local time` : "";

  const row = (label: string, content: ReactNode) => (
    <div style={{ display: "flex", gap: 12, padding: "10px 0", borderTop: `1px solid ${C.border}` }}>
      <span style={{ width: 58, color: C.textMute3, flex: "none", fontSize: 12 }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: C.text3, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{content}</div>
    </div>
  );
  const rsvp = ev.responseStatus || "needsAction";
  const declined = rsvp === "declined";
  const parsed = parseCapture(title, today);
  const cleanTitle = parsed.title || title.trim();
  const effectiveDate = dateTouched ? date : parsed.date || date;
  const effectiveStart = startTouched ? start : parsed.time ?? start;
  const effectiveDur = durTouched ? dur : parsed.est || dur;
  const canSave = !!cleanTitle && !!effectiveDate && effectiveStart != null && effectiveDur > 0;
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
  const commit = () => {
    if (!canSave || effectiveStart == null) return;
    renameEvent(ev.id, cleanTitle);
    rescheduleEvent(ev.id, effectiveDate, effectiveStart, effectiveStart + effectiveDur);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
      close();
    } else if (e.key === "Escape") close();
  };

  return (
    <div onClick={close} style={overlay("16vh")}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 560, maxWidth: "92vw", background: C.modalBg, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, boxShadow: "0 30px 90px rgba(0,0,0,0.6)", overflow: "hidden", animation: "rise .16s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flex: "none" }} />
          <span style={{ fontSize: 11.5, color: C.textMute2 }}>Event · {fmtDur(ev.end - ev.start)}</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.textFaint2 }}>esc to close</span>
        </div>

        <input
          className="capture-input"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commit}
          onKeyDown={onKey}
          style={{ width: "100%", background: "none", border: "none", outline: "none", color: declined ? C.textMute2 : C.text, textDecoration: declined ? "line-through" : "none", fontSize: 18, fontWeight: 650, padding: "18px 18px 8px" }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 88px", gap: 8, padding: "6px 18px 10px" }}>
          <input className="capture-input" type="date" value={effectiveDate || ""} onChange={(e) => { setDateTouched(true); setDate(e.target.value); }} style={fieldStyle} />
          <input className="capture-input" type="time" value={timeValue(effectiveStart)} onChange={(e) => { setStartTouched(true); setStart(parseTimeValue(e.target.value)); }} style={fieldStyle} />
          <input className="capture-input" type="number" min={15} step={15} value={effectiveDur} onChange={(e) => { setDurTouched(true); setDur(Number(e.target.value) || 30); }} style={fieldStyle} />
        </div>

        <div style={{ padding: "0 18px 8px", display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, padding: "4px 9px", borderRadius: 7, background: "rgba(255,122,69,0.14)", color: accent }}>{effectiveDate ? `${weekdayShort(effectiveDate)} ${effectiveStart != null ? fmtTime(effectiveStart) : ""}` : "Date required"}</span>
          {effectiveStart != null && <span style={{ fontSize: 12, padding: "4px 9px", borderRadius: 7, background: "rgba(91,155,255,0.13)", color: "#C6DBFF" }}>{fmtDur(effectiveDur)}</span>}
          {cleanTitle !== title.trim() && <span style={{ fontSize: 12, padding: "4px 9px", borderRadius: 7, background: "rgba(255,255,255,0.05)", color: C.textMute2 }}>{cleanTitle}</span>}
          {declined && <span style={{ fontSize: 12, padding: "4px 9px", borderRadius: 7, background: "rgba(229,115,107,0.14)", color: C.overdue }}>RSVP no</span>}
        </div>

        <div style={{ padding: "0 18px 8px" }}>
          {ev.canRsvp &&
            row(
              "RSVP",
              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                {(["accepted", "tentative", "declined"] as const).map((status) => {
                  const active = rsvp === status;
                  const label = status === "accepted" ? "Yes" : status === "tentative" ? "Maybe" : "No";
                  return (
                    <Hoverable
                      key={status}
                      as="button"
                      onClick={() => setEventRsvp(ev.id, status)}
                      style={{ background: active ? color : C.rowHover, border: active ? "none" : "1px solid rgba(255,255,255,0.08)", color: active ? "#fff" : C.textMute, fontSize: 12.5, borderRadius: 7, padding: "6px 10px", cursor: "pointer" }}
                      hover={{ background: active ? color : "#222630", color: "#fff" }}
                    >
                      {label}
                    </Hoverable>
                  );
                })}
              </div>
            )}
          {ev.location && row("Place", ev.location)}
          {ev.description && row("Notes", <DescriptionText text={ev.description} />)}
          {tzNote && row("Time zone", <span style={{ color: "#E5B84A" }}>{tzNote}</span>)}
        </div>

        <div style={{ display: "flex", gap: 8, padding: "12px 16px", background: C.modalFooterBg, borderTop: `1px solid ${C.border}` }}>
          <Hoverable as="button" onClick={() => deleteEvent(ev.id)} style={{ background: "none", border: "1px solid rgba(229,115,107,0.3)", color: "#E5736B", fontSize: 12.5, fontWeight: 500, borderRadius: 8, padding: "7px 12px", cursor: "pointer" }} hover={{ background: "rgba(229,115,107,0.12)" }}>
            Delete
          </Hoverable>
          <Hoverable as="button" onClick={() => addBufferAfter(ev.id)} title="Add a short transition block after this" style={{ background: C.rowHover, border: "1px solid rgba(255,255,255,0.08)", color: C.textMute, fontSize: 12.5, borderRadius: 8, padding: "7px 12px", cursor: "pointer", flex: "none" }} hover={{ background: "#222630", color: "#fff" }}>
            + Buffer after
          </Hoverable>
          {join && (
            <Hoverable as="button" onClick={() => api.openUrl(join)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#1A8A4F", border: "none", borderRadius: 8, padding: "7px 12px", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }} hover={{ filter: "brightness(1.1)" }}>
              Join meeting
            </Hoverable>
          )}
          <span style={{ flex: 1 }} />
          <button disabled={!canSave} onClick={() => { commit(); close(); }} style={{ display: "flex", alignItems: "center", gap: 8, background: accent, color: ACCENT_FG, fontWeight: 600, fontSize: 13, border: "none", borderRadius: 8, padding: "7px 18px", cursor: canSave ? "pointer" : "default", opacity: canSave ? 1 : 0.45 }}>
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

/**
 * Convert a Google Calendar HTML description into plain text: line breaks and
 * block tags become newlines, anchors keep their href, remaining tags are
 * stripped and HTML entities decoded. (No innerHTML rendering — avoids XSS.)
 */
function htmlToText(html: string): string {
  let s = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|li|tr|h[1-6]|ul|ol)\s*>/gi, "\n")
    .replace(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => {
      const text = label.replace(/<[^>]+>/g, "").trim();
      return !text || text === href ? href : `${text} (${href})`;
    })
    .replace(/<[^>]+>/g, "");
  // Decode HTML entities (&amp; &lt; &nbsp; &#39; …) via the DOM.
  const ta = document.createElement("textarea");
  ta.innerHTML = s;
  s = ta.value;
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

/** Render description text, turning bare URLs into clickable links. */
function DescriptionText({ text }: { text: string }) {
  const parts = htmlToText(text).split(/(https?:\/\/[^\s]+)/g);
  return (
    <span style={{ whiteSpace: "pre-wrap" }}>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} onClick={(e) => { e.preventDefault(); api.openUrl(p); }} href={p} style={{ color: "#7FB0FF", textDecoration: "none", cursor: "pointer" }}>
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </span>
  );
}
