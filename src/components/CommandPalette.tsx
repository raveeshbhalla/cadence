import { useMemo, type KeyboardEvent } from "react";
import { C } from "../theme";
import { useApp } from "../store/app";
import { Hoverable } from "./Hoverable";
import { Search } from "./Icon";
import { overlay } from "./overlay";

interface Command {
  id: string;
  name: string;
  hint: string;
  glyph: string;
  run: () => void;
}

export function CommandPalette() {
  const s = useApp();
  const query = useApp((st) => st.paletteQuery);

  const commands = useMemo<Command[]>(() => {
    return [
      { id: "new", name: "New task", hint: "⌘N", glyph: "＋", run: () => s.openCapture() },
      { id: "side", name: (s.sidebarHidden ? "Show" : "Hide") + " sidebar", hint: "", glyph: "▤", run: () => { s.toggleSidebar(); s.closeModal(); } },
      { id: "avail", name: "Share availability", hint: "Copy 3 open slots", glyph: "◷", run: () => { s.closeModal(); s.shareAvailability(); } },
      { id: "meet", name: "Meet with…", hint: "Find a time", glyph: "◎", run: () => { s.closeModal(); s.setToast("Meet with… (demo)"); } },
      { id: "email", name: (s.showEmail ? "Hide" : "Show") + " Gmail · Primary", hint: "Email source", glyph: "✉", run: () => { s.toggleEmailSource(); s.closeModal(); } },
      { id: "today", name: "Go to today", hint: "", glyph: "◆", run: () => { s.closeModal(); s.gotoToday(); } },
      { id: "clear", name: "Clear completed", hint: "", glyph: "✓", run: () => { s.clearCompleted(); s.closeModal(); s.setToast("Cleared completed"); } },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.sidebarHidden, s.showEmail]);

  const filtered = useMemo(() => {
    const q = (query || "").toLowerCase();
    return commands.filter((c) => c.name.toLowerCase().includes(q));
  }, [commands, query]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[0]) filtered[0].run();
    } else if (e.key === "Escape") s.closeModal();
  };

  return (
    <div onClick={s.closeModal} style={overlay("14vh")}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 560, maxWidth: "92vw", background: C.modalBg, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, boxShadow: "0 30px 90px rgba(0,0,0,0.6)", overflow: "hidden", animation: "rise .16s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
          <Search size={16} stroke="#8A8E98" />
          <input
            autoFocus
            value={query}
            onChange={(e) => s.setPaletteQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Type a command…"
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.text, fontSize: 15 }}
          />
        </div>
        <div style={{ maxHeight: 340, overflowY: "auto", padding: 6 }}>
          {filtered.map((cmd, i) => (
            <Hoverable
              key={cmd.id}
              onClick={cmd.run}
              style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 10px", borderRadius: 9, cursor: "pointer", background: i === 0 ? "rgba(255,255,255,0.05)" : "transparent" }}
              hover={{ background: "rgba(255,255,255,0.08)" }}
            >
              <span style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{cmd.glyph}</span>
              <span style={{ flex: 1, fontSize: 13.5, color: C.text2 }}>{cmd.name}</span>
              {cmd.hint && <span style={{ fontSize: 11, color: C.textFaint }}>{cmd.hint}</span>}
            </Hoverable>
          ))}
        </div>
      </div>
    </div>
  );
}
