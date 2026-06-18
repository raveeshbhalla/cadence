import { useEffect, useMemo, useState } from "react";
import { C, CATS } from "../theme";
import { fmtTime } from "../lib/format";
import { dateKey, monthShort, parseKey, weekdayShort } from "../lib/dates";
import { api, type EventDto } from "../lib/api";
import { useApp } from "../store/app";
import { Hoverable } from "./Hoverable";
import { Search as SearchIcon } from "./Icon";
import { overlay } from "./overlay";

interface Hit {
  key: string;
  title: string;
  sub: string;
  onPick: () => void;
  tint: string;
}

export function Search() {
  const tasks = useApp((s) => s.tasks);
  const jumpToDate = useApp((s) => s.jumpToDate);
  const openEditor = useApp((s) => s.openEditor);
  const close = useApp((s) => s.closeModal);
  const [q, setQ] = useState("");
  const [events, setEvents] = useState<EventDto[]>([]);

  // Debounced calendar search across ±1 year.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setEvents([]);
      return;
    }
    const t = setTimeout(() => {
      const yr = 365 * 86400000;
      const min = new Date(Date.now() - yr).toISOString();
      const max = new Date(Date.now() + yr).toISOString();
      api.searchEvents(term, min, max).then(setEvents).catch(() => setEvents([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const hits = useMemo<Hit[]>(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    const taskHits: Hit[] = tasks
      .filter((t) => t.title.toLowerCase().includes(term))
      .slice(0, 8)
      .map((t) => ({
        key: "t:" + t.id,
        title: t.title,
        sub: t.status === "completed" ? "task · done" : t.due ? "task · due " + t.due : "task",
        tint: (CATS[t.cat] || CATS.work).dot,
        onPick: () => {
          openEditor(t.id);
        },
      }));
    const eventHits: Hit[] = events.slice(0, 12).map((e) => {
      const d = new Date(e.start);
      const date = dateKey(d);
      return {
        key: "e:" + e.id,
        title: e.title,
        sub: `${weekdayShort(date)} ${monthShort(date)} ${parseKey(date).getDate()}, ${parseKey(date).getFullYear()}${e.allDay ? "" : " · " + fmtTime(d.getHours() * 60 + d.getMinutes())}`,
        tint: e.color || "#5B9BFF",
        onPick: () => jumpToDate(date),
      };
    });
    return [...eventHits, ...taskHits];
  }, [q, events, tasks, jumpToDate, openEditor]);

  return (
    <div onClick={close} style={overlay("13vh")}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 560, maxWidth: "92vw", background: C.modalBg, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, boxShadow: "0 30px 90px rgba(0,0,0,0.6)", overflow: "hidden", animation: "rise .16s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
          <SearchIcon size={16} stroke="#8A8E98" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && hits[0]) {
                e.preventDefault();
                hits[0].onPick();
              } else if (e.key === "Escape") close();
            }}
            placeholder="Search events and tasks…"
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.text, fontSize: 15 }}
          />
        </div>
        <div style={{ maxHeight: 380, overflowY: "auto", padding: 6 }}>
          {q.trim().length < 2 ? (
            <div style={{ fontSize: 12.5, color: C.textFaint2, textAlign: "center", padding: "20px 0" }}>Type to search your calendar and tasks.</div>
          ) : hits.length === 0 ? (
            <div style={{ fontSize: 12.5, color: C.textFaint2, textAlign: "center", padding: "20px 0" }}>No matches.</div>
          ) : (
            hits.map((h) => (
              <Hoverable key={h.key} onClick={h.onPick} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 10px", borderRadius: 9, cursor: "pointer" }} hover={{ background: "rgba(255,255,255,0.06)" }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: h.tint, flex: "none" }} />
                <span style={{ flex: 1, fontSize: 13.5, color: C.text2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.title}</span>
                <span style={{ fontSize: 11.5, color: C.textMute2, flex: "none" }}>{h.sub}</span>
              </Hoverable>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
