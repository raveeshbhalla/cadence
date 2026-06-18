import { useMemo } from "react";
import { ACCENT_FG, C, CATS } from "../theme";
import type { CategoryKey } from "../theme";
import { useApp } from "../store/app";
import { Hoverable } from "./Hoverable";
import { CheckList, ChevronLeft, ChevronRight, Mail, Plus } from "./Icon";

const MINI_HEAD = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const CAL_DEFS: { name: string; cat: CategoryKey }[] = [
  { name: "Work", cat: "work" },
  { name: "Design", cat: "design" },
  { name: "Engineering", cat: "eng" },
  { name: "Sales", cat: "sales" },
  { name: "Personal", cat: "personal" },
];
const PROJ_DEFS: { name: string; cat: CategoryKey }[] = [
  { name: "Work", cat: "work" },
  { name: "Design", cat: "design" },
  { name: "Engineering", cat: "eng" },
  { name: "Sales", cat: "sales" },
];

export function Sidebar() {
  const accent = useApp((s) => s.accent);
  const tasks = useApp((s) => s.tasks);
  const hidden = useApp((s) => s.hidden);
  const showEmail = useApp((s) => s.showEmail);
  const toggleCal = useApp((s) => s.toggleCal);
  const toggleEmailSource = useApp((s) => s.toggleEmailSource);
  const openCapture = useApp((s) => s.openCapture);
  const prev = useApp((s) => s.prevWeek);
  const next = useApp((s) => s.nextWeek);

  const miniCells = useMemo(() => {
    const cells: { n: number; style: React.CSSProperties }[] = [];
    for (let d = 1; d <= 30; d++) {
      const isT = d === 17;
      const inw = d >= 15 && d <= 21;
      const style: React.CSSProperties = { fontSize: 11, textAlign: "center", padding: "4px 0", borderRadius: 6 };
      if (isT) {
        style.background = accent;
        style.color = ACCENT_FG;
        style.fontWeight = 700;
      } else if (inw) {
        style.background = "rgba(255,255,255,0.05)";
        style.color = C.text3;
      } else style.color = C.textMute;
      cells.push({ n: d, style });
    }
    for (let d = 1; d <= 5; d++) cells.push({ n: d, style: { fontSize: 11, textAlign: "center", padding: "4px 0", color: "#3A3D45" } });
    return cells;
  }, [accent]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of PROJ_DEFS) c[p.cat] = tasks.filter((t) => t.status !== "completed" && t.cat === p.cat).length;
    return c;
  }, [tasks]);

  const openGtasks = tasks.filter((t) => t.status !== "completed" && t.source !== "gmail").length;
  const emailCount = tasks.filter((t) => t.status !== "completed" && t.source === "gmail").length;

  const sectionLabel: React.CSSProperties = { marginTop: 18, fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: C.textFaint2, marginBottom: 6 };

  return (
    <div style={{ width: 236, flex: "none", background: C.sidebarBg, borderRight: `1px solid ${C.borderSoft}`, display: "flex", flexDirection: "column", padding: "16px 14px", overflowY: "auto" }}>
      {/* mini month */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text3 }}>June 2026</span>
        <div style={{ display: "flex", gap: 2 }}>
          <Hoverable as="button" onClick={prev} style={{ background: "none", border: "none", color: C.textMute3, cursor: "pointer", padding: 2 }} hover={{ color: "#fff" }}>
            <ChevronLeft />
          </Hoverable>
          <Hoverable as="button" onClick={next} style={{ background: "none", border: "none", color: C.textMute3, cursor: "pointer", padding: 2 }} hover={{ color: "#fff" }}>
            <ChevronRight />
          </Hoverable>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, marginBottom: 4 }}>
        {MINI_HEAD.map((h) => (
          <span key={h} style={{ fontSize: 10, color: C.textFaint2, textAlign: "center", padding: "2px 0" }}>{h}</span>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1 }}>
        {miniCells.map((c, i) => (
          <span key={i} style={c.style}>{c.n}</span>
        ))}
      </div>

      {/* calendars */}
      <div style={sectionLabel}>Calendars</div>
      {CAL_DEFS.map((cal) => {
        const h = hidden.has(cal.cat);
        return (
          <Hoverable key={cal.cat} onClick={() => toggleCal(cal.cat)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 6px", borderRadius: 7, cursor: "pointer" }} hover={{ background: C.rowHover }}>
            <span style={{ width: 11, height: 11, borderRadius: 3.5, flex: "none", background: h ? "transparent" : CATS[cal.cat].dot, border: `1.5px solid ${CATS[cal.cat].dot}` }} />
            <span style={{ flex: 1, fontSize: 12.5, color: h ? C.textFaint2 : C.text4 }}>{cal.name}</span>
          </Hoverable>
        );
      })}

      {/* sources */}
      <div style={sectionLabel}>Sources</div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: 6, borderRadius: 7 }}>
        <CheckList stroke="#57C77E" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: C.text4 }}>Google Tasks</div>
          <div style={{ fontSize: 10.5, color: C.textFaint }}>On · {openGtasks} open</div>
        </div>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#57C77E", flex: "none" }} />
      </div>
      <Hoverable onClick={toggleEmailSource} style={{ display: "flex", alignItems: "center", gap: 9, padding: 6, borderRadius: 7, cursor: "pointer" }} hover={{ background: C.rowHover }}>
        <Mail />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: C.text4 }}>Gmail · Primary</div>
          <div style={{ fontSize: 10.5, color: C.textFaint }}>{showEmail ? `On · ${emailCount} need reply` : "Hidden"}</div>
        </div>
        <span style={{ width: 30, height: 18, borderRadius: 20, flex: "none", position: "relative", transition: "background .15s", background: showEmail ? accent : "#3A3D45" }}>
          <span style={{ position: "absolute", top: 2, left: showEmail ? 14 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
        </span>
      </Hoverable>

      {/* lists */}
      <div style={sectionLabel}>Lists</div>
      {PROJ_DEFS.map((p) => (
        <Hoverable key={p.cat} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 6px", borderRadius: 7, cursor: "default" }} hover={{ background: C.rowHover }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, flex: "none", background: CATS[p.cat].dot }} />
          <span style={{ flex: 1, fontSize: 12.5, color: C.text5 }}>{p.name}</span>
          <span style={{ fontSize: 11, color: C.textFaint2 }}>{counts[p.cat]}</span>
        </Hoverable>
      ))}

      <div style={{ flex: 1 }} />
      <Hoverable as="button" onClick={openCapture} style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, width: "100%", background: C.rowHover, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "8px 10px", color: "#A2A6B0", fontSize: 12.5, cursor: "pointer" }} hover={{ background: "#222630", color: "#fff" }}>
        <Plus />
        New task
        <span style={{ marginLeft: "auto", fontSize: 11, color: C.textFaint, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, padding: "0 5px" }}>⌘N</span>
      </Hoverable>
    </div>
  );
}
