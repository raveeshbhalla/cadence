import { C } from "../theme";
import { fmtDur, fmtTime } from "../lib/format";
import { monthShort, parseKey, weekdayShort } from "../lib/dates";
import { meetingLink } from "../lib/meeting";
import { api } from "../lib/api";
import { useApp } from "../store/app";
import { Hoverable } from "./Hoverable";
import { overlay } from "./overlay";

export function EventDetails() {
  const ev = useApp((s) => s.events.find((e) => e.id === s.eventDetailsId));
  const close = useApp((s) => s.closeEventDetails);
  const addBufferAfter = useApp((s) => s.addBufferAfter);
  if (!ev) return null;

  const d = parseKey(ev.date);
  const when = `${weekdayShort(ev.date)}, ${monthShort(ev.date)} ${d.getDate()} · ${fmtTime(ev.start)} – ${fmtTime(ev.end)} · ${fmtDur(ev.end - ev.start)}`;
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

  const row = (icon: string, content: React.ReactNode) => (
    <div style={{ display: "flex", gap: 12, padding: "10px 0", borderTop: `1px solid ${C.border}` }}>
      <span style={{ width: 18, textAlign: "center", color: C.textMute3, flex: "none", fontSize: 13 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: C.text3, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{content}</div>
    </div>
  );

  return (
    <div onClick={close} style={overlay("16vh")}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 480, maxWidth: "92vw", background: C.modalBg, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, boxShadow: "0 30px 90px rgba(0,0,0,0.6)", overflow: "hidden", animation: "rise .16s ease-out" }}>
        <div style={{ padding: "18px 20px 14px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: color, flex: "none", marginTop: 5 }} />
            <div style={{ fontSize: 19, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{ev.title}</div>
            <span style={{ marginLeft: "auto", fontSize: 11, color: C.textFaint2, flex: "none", marginTop: 4 }}>esc</span>
          </div>
          <div style={{ fontSize: 13, color: C.textMute, marginTop: 8, marginLeft: 23 }}>{when}</div>
          {tzNote && <div style={{ fontSize: 11.5, color: "#E5B84A", marginTop: 5, marginLeft: 23 }}>⚠ {tzNote}</div>}
        </div>

        <div style={{ padding: "0 20px 8px" }}>
          {ev.location && row("📍", ev.location)}
          {ev.description && row("≡", <DescriptionText text={ev.description} />)}
          {!ev.location && !ev.description && row("ℹ", <span style={{ color: C.textMute2 }}>No location or description.</span>)}
        </div>

        <div style={{ display: "flex", gap: 8, padding: "12px 16px", background: C.modalFooterBg, borderTop: `1px solid ${C.border}` }}>
          <Hoverable as="button" onClick={() => addBufferAfter(ev.id)} title="Add a short transition block after this" style={{ background: C.rowHover, border: "1px solid rgba(255,255,255,0.08)", color: C.textMute, fontSize: 12.5, borderRadius: 9, padding: "10px 14px", cursor: "pointer", flex: "none" }} hover={{ background: "#222630", color: "#fff" }}>
            + Buffer after
          </Hoverable>
          {join && (
            <Hoverable as="button" onClick={() => api.openUrl(join)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flex: 1, background: "#1A8A4F", border: "none", borderRadius: 9, padding: "10px", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }} hover={{ filter: "brightness(1.1)" }}>
              Join meeting
            </Hoverable>
          )}
        </div>
      </div>
    </div>
  );
}

/** Render description text, turning bare URLs into clickable links. */
function DescriptionText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} onClick={(e) => { e.preventDefault(); api.openUrl(p); }} href={p} style={{ color: "#7FB0FF", textDecoration: "none", cursor: "pointer" }}>
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}
