import { useMemo, useState, type KeyboardEvent } from "react";
import { ACCENT_FG, C } from "../theme";
import { addDays, dateKey, monthShort, nextDow, parseKey, weekdayShort } from "../lib/dates";
import { useApp } from "../store/app";
import { overlay } from "./overlay";

const DOW: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Parse a free-form "go to date" string into a YYYY-MM-DD key. */
function parseGoto(input: string, today: string): string | null {
  const t = input.trim().toLowerCase();
  if (!t) return null;
  if (t === "today") return today;
  if (t === "tomorrow") return addDays(today, 1);
  if (t === "yesterday") return addDays(today, -1);
  if (t === "next week") return addDays(today, 7);
  if (t === "last week") return addDays(today, -7);
  for (const k in DOW) if (t.startsWith(k)) return nextDow(today, DOW[k]);
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;

  const monthDay = t.match(/^([a-z]+)\.?\s+(\d{1,2})$/) || t.match(/^(\d{1,2})\s+([a-z]+)\.?$/);
  if (monthDay) {
    const [monStr, day] = /^\d/.test(monthDay[1]) ? [monthDay[2], parseInt(monthDay[1])] : [monthDay[1], parseInt(monthDay[2])];
    const mi = MONTHS.findIndex((m) => monStr.startsWith(m));
    if (mi >= 0 && day >= 1 && day <= 31) return nextOccurrence(today, mi, day);
  }
  const md = t.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (md) return nextOccurrence(today, parseInt(md[1]) - 1, parseInt(md[2]));
  return null;
}

function nextOccurrence(today: string, monthIdx: number, day: number): string | null {
  const y = parseKey(today).getFullYear();
  let cand = dateKey(new Date(y, monthIdx, day));
  if (cand < today) cand = dateKey(new Date(y + 1, monthIdx, day));
  return cand;
}

export function GoToDate() {
  const today = useApp((s) => s.today);
  const accent = useApp((s) => s.accent);
  const jumpToDate = useApp((s) => s.jumpToDate);
  const close = useApp((s) => s.closeModal);
  const [text, setText] = useState("");

  const resolved = useMemo(() => parseGoto(text, today), [text, today]);
  const preview = resolved ? `${weekdayShort(resolved)} ${monthShort(resolved)} ${parseKey(resolved).getDate()}, ${parseKey(resolved).getFullYear()}` : "";

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (resolved) jumpToDate(resolved);
    } else if (e.key === "Escape") close();
  };

  return (
    <div onClick={close} style={overlay("18vh")}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 460, maxWidth: "92vw", background: C.modalBg, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, boxShadow: "0 30px 90px rgba(0,0,0,0.6)", overflow: "hidden", animation: "rise .16s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 14px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: accent, background: "rgba(255,122,69,0.12)", borderRadius: 6, padding: "3px 8px" }}>Go to date</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.textFaint2 }}>esc</span>
        </div>
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder="friday · tomorrow · Jul 1 · 12/25 · 2026-08-15"
          style={{ width: "100%", background: "none", border: "none", outline: "none", color: C.text, fontSize: 18, padding: "16px 18px 8px" }}
        />
        <div style={{ padding: "0 18px 14px", minHeight: 22, fontSize: 13, color: preview ? C.textMute : C.textFaint2 }}>
          {preview || "Type a date…"}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "11px 16px", background: C.modalFooterBg, borderTop: `1px solid ${C.border}` }}>
          <button onClick={() => resolved && jumpToDate(resolved)} disabled={!resolved} style={{ display: "flex", alignItems: "center", gap: 8, background: resolved ? accent : C.rowHover, color: resolved ? ACCENT_FG : C.textFaint2, fontWeight: 600, fontSize: 13, border: "none", borderRadius: 8, padding: "7px 16px", cursor: resolved ? "pointer" : "default" }}>
            Go <span className="keycap">↵</span>
          </button>
        </div>
      </div>
    </div>
  );
}
