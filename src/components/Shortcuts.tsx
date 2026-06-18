import { C } from "../theme";
import { useApp } from "../store/app";
import { overlay } from "./overlay";

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "Capture & commands",
    items: [
      ["⌘N", "New task / capture"],
      ["⌘K", "Command palette"],
      ["⌘Z", "Undo last change"],
      ["⌘J", "Join next meeting"],
    ],
  },
  {
    title: "Navigation",
    items: [
      ["T", "Go to this week"],
      ["[  ]", "Previous / next week"],
      ["G", "Go to date…"],
      ["?", "This shortcuts list"],
    ],
  },
  {
    title: "On the grid",
    items: [
      ["drag", "Pull out a time block (event by default)"],
      ["[ ]", "In capture: make it a task"],
      ["click", "Open a meeting / edit a task block"],
      ["Esc", "Close any dialog"],
    ],
  },
];

export function Shortcuts() {
  const close = useApp((s) => s.closeModal);
  return (
    <div onClick={close} style={overlay("12vh")}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 560, maxWidth: "92vw", background: C.modalBg, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, boxShadow: "0 30px 90px rgba(0,0,0,0.6)", overflow: "hidden", animation: "rise .16s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Keyboard shortcuts</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.textFaint2 }}>esc</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, padding: "18px 20px 22px" }}>
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: C.textFaint2, marginBottom: 10 }}>{g.title}</div>
              {g.items.map(([key, label]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.text3, background: C.rowHover, border: "1px solid rgba(255,255,255,0.12)", borderBottomWidth: 2, borderRadius: 5, padding: "1px 6px", flex: "none", minWidth: 22, textAlign: "center" }}>{key}</span>
                  <span style={{ fontSize: 12, color: C.textMute, lineHeight: 1.35 }}>{label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
