import { ACCENT_FG, C } from "../theme";
import { fmtTime } from "../lib/format";
import { monthShort, parseKey, weekdayShort } from "../lib/dates";
import { useApp } from "../store/app";
import { Hoverable } from "./Hoverable";

export function AvailabilityPanel() {
  const accent = useApp((s) => s.accent);
  const slots = useApp((s) => s.availabilitySlots);
  const label = useApp((s) => s.availabilityLabel);
  const setLabel = useApp((s) => s.setAvailabilityLabel);
  const remove = useApp((s) => s.removeAvailabilitySlot);
  const copy = useApp((s) => s.copyAvailability);
  const exit = useApp((s) => s.exitAvailability);

  return (
    <div style={{ position: "fixed", right: 20, bottom: 20, width: 320, background: C.modalBg, border: `1px solid ${accent}`, borderRadius: 13, boxShadow: "0 24px 70px rgba(0,0,0,0.6)", zIndex: 9200, overflow: "hidden", animation: "rise .18s ease-out" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: `1px solid ${C.border}` }}>
        <span style={{ width: 9, height: 9, borderRadius: 3, background: accent }} />
        <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>Share availability</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: C.textMute2 }}>{slots.length} slot{slots.length === 1 ? "" : "s"}</span>
      </div>

      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="What are these times for? (optional)"
        style={{ width: "100%", background: "none", border: "none", borderBottom: `1px solid ${C.border}`, outline: "none", color: C.text2, fontSize: 12.5, padding: "10px 14px" }}
      />

      <div style={{ maxHeight: 220, overflowY: "auto", padding: "6px 8px" }}>
        {slots.length === 0 ? (
          <div style={{ fontSize: 12, color: C.textMute2, textAlign: "center", padding: "18px 10px", lineHeight: 1.5 }}>Drag across the calendar to add open time slots.</div>
        ) : (
          slots.map((sl, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 7, fontSize: 12.5, color: C.text3 }}>
              <span style={{ color: accent }}>•</span>
              <span style={{ flex: 1 }}>
                {weekdayShort(sl.date)} {monthShort(sl.date)} {parseKey(sl.date).getDate()}, {fmtTime(sl.start)} – {fmtTime(sl.end)}
              </span>
              <Hoverable as="button" onClick={() => remove(i)} style={{ background: "none", border: "none", color: C.textFaint2, cursor: "pointer", fontSize: 13, padding: 2 }} hover={{ color: "#E5736B" }}>
                ×
              </Hoverable>
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", gap: 8, padding: "11px 14px", background: C.modalFooterBg, borderTop: `1px solid ${C.border}` }}>
        <Hoverable as="button" onClick={exit} style={{ background: C.rowHover, border: "1px solid rgba(255,255,255,0.08)", color: C.textMute, fontSize: 12.5, borderRadius: 8, padding: "7px 12px", cursor: "pointer" }} hover={{ background: "#222630", color: "#fff" }}>
          Done
        </Hoverable>
        <span style={{ flex: 1 }} />
        <button onClick={copy} disabled={!slots.length} style={{ background: slots.length ? accent : C.rowHover, color: slots.length ? ACCENT_FG : C.textFaint2, fontWeight: 600, fontSize: 12.5, border: "none", borderRadius: 8, padding: "7px 14px", cursor: slots.length ? "pointer" : "default" }}>
          Copy to clipboard
        </button>
      </div>
    </div>
  );
}
