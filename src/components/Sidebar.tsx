import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ACCENT_FG, C, CATS } from "../theme";
import { useApp } from "../store/app";
import { catFromProject } from "../lib/format";
import { dateKey, monthLabel, parseKey, weekDates } from "../lib/dates";
import { taskListKey } from "../lib/taskLists";
import { Hoverable } from "./Hoverable";
import { ChevronLeft, ChevronRight, Mail, Plus } from "./Icon";

const MINI_HEAD = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function monthStartKey(date: string): string {
  const d = parseKey(date);
  return dateKey(new Date(d.getFullYear(), d.getMonth(), 1));
}

function addMonths(date: string, n: number): string {
  const d = parseKey(date);
  return dateKey(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

export function Sidebar() {
  const accent = useApp((s) => s.accent);
  const tasks = useApp((s) => s.tasks);
  const events = useApp((s) => s.events);
  const calendars = useApp((s) => s.calendars);
  const lists = useApp((s) => s.lists);
  const hiddenCals = useApp((s) => s.hiddenCals);
  const hiddenLists = useApp((s) => s.hiddenLists);
  const showEmail = useApp((s) => s.showEmail);
  const toggleCalendar = useApp((s) => s.toggleCalendar);
  const toggleList = useApp((s) => s.toggleList);
  const toggleEmailSource = useApp((s) => s.toggleEmailSource);
  const openCapture = useApp((s) => s.openCapture);
  const jumpToDate = useApp((s) => s.jumpToDate);
  const today = useApp((s) => s.today);
  const viewMonday = useApp((s) => s.viewMonday);
  const view = useApp((s) => s.view);
  const focusDay = useApp((s) => s.focusDay);
  const isInitialHydrating = useApp((s) => s.isHydrating && !s.lastSync);
  const centerAnchor = view === "day" ? focusDay : view === "focus" ? today : weekDates(viewMonday)[2];
  const [miniMonth, setMiniMonth] = useState(() => monthStartKey(centerAnchor));

  useEffect(() => {
    setMiniMonth(monthStartKey(centerAnchor));
  }, [centerAnchor]);

  const { miniCells, miniMonthLabel } = useMemo(() => {
    const week = new Set(weekDates(viewMonday));
    const anchor = parseKey(miniMonth);
    const y = anchor.getFullYear();
    const mo = anchor.getMonth();
    const firstDow = (new Date(y, mo, 1).getDay() + 6) % 7;
    const dim = new Date(y, mo + 1, 0).getDate();
    const cells: { n: number | null; key: string; date: string | null; style: CSSProperties }[] = [];
    for (let i = 0; i < firstDow; i++) cells.push({ n: null, key: `blank-${i}`, date: null, style: {} });
    for (let d = 1; d <= dim; d++) {
      const key = dateKey(new Date(y, mo, d));
      const isToday = key === today;
      const isSelected = view === "day" ? key === focusDay : isToday;
      const inWeek = week.has(key);
      const style: CSSProperties = {
        appearance: "none",
        border: "none",
        fontSize: 11,
        textAlign: "center",
        padding: "4px 0",
        borderRadius: 6,
        background: "transparent",
        cursor: "pointer",
      };
      if (isSelected) {
        style.background = accent;
        style.color = ACCENT_FG;
        style.fontWeight = 700;
      } else if (inWeek) {
        style.background = "rgba(255,255,255,0.05)";
        style.color = C.text3;
      } else style.color = C.textMute;
      cells.push({ n: d, key, date: key, style });
    }
    return { miniCells: cells, miniMonthLabel: monthLabel(miniMonth) };
  }, [accent, focusDay, miniMonth, today, view, viewMonday]);

  const listCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of tasks) {
      if (t.status === "completed") continue;
      const key = taskListKey(t);
      if (key) c[key] = (c[key] || 0) + 1;
    }
    return c;
  }, [tasks]);

  const taskLists = useMemo(() => {
    if (lists.length) return lists;
    const seen = new Map<string, string>();
    for (const t of tasks) {
      const key = taskListKey(t);
      if (key && !seen.has(key)) seen.set(key, t.project || "No list");
    }
    return Array.from(seen, ([id, title]) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title));
  }, [lists, tasks]);

  const emailCount = tasks.filter((t) => t.status !== "completed" && t.source === "gmail").length;

  const sectionLabel: CSSProperties = { marginTop: 18, fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: C.textFaint2, marginBottom: 6 };

  return (
    <div style={{ width: 236, flex: "none", background: C.sidebarBg, borderRight: `1px solid ${C.borderSoft}`, display: "flex", flexDirection: "column", padding: "16px 14px", overflowY: "auto" }}>
      {/* mini month */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span data-mini-month style={{ fontSize: 13, fontWeight: 600, color: C.text3 }}>{miniMonthLabel}</span>
        <div style={{ display: "flex", gap: 2 }}>
          <Hoverable as="button" data-mini-prev onClick={() => setMiniMonth((m) => addMonths(m, -1))} style={{ background: "none", border: "none", color: C.textMute3, cursor: "pointer", padding: 2 }} hover={{ color: "#fff" }}>
            <ChevronLeft />
          </Hoverable>
          <Hoverable as="button" data-mini-next onClick={() => setMiniMonth((m) => addMonths(m, 1))} style={{ background: "none", border: "none", color: C.textMute3, cursor: "pointer", padding: 2 }} hover={{ color: "#fff" }}>
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
        {miniCells.map((c) =>
          c.date ? (
            <button key={c.key} onClick={() => jumpToDate(c.date!)} style={c.style}>
              {c.n}
            </button>
          ) : (
            <span key={c.key} style={c.style} />
          )
        )}
      </div>

      {/* email sources */}
      <div style={sectionLabel}>Email</div>
      {isInitialHydrating ? (
        <SidebarSkeletonRow iconSize={14} metaWidth="46%" />
      ) : (
        <Hoverable onClick={toggleEmailSource} style={{ display: "flex", alignItems: "center", gap: 9, padding: 6, borderRadius: 7, cursor: "pointer" }} hover={{ background: C.rowHover }}>
          <Mail />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: C.text4 }}>Gmail · Primary</div>
            <div style={{ fontSize: 10.5, color: C.textFaint }}>{showEmail ? `On · ${emailCount} need reply` : "Hidden"}</div>
          </div>
          <Toggle on={showEmail} accent={accent} />
        </Hoverable>
      )}

      {/* calendars */}
      {isInitialHydrating ? (
        <>
          <div style={sectionLabel}>Calendars</div>
          <SidebarSkeletonRow titleWidth="62%" />
          <SidebarSkeletonRow titleWidth="48%" />
        </>
      ) : (calendars.length > 0 || events.length > 0) && (
        <>
          <div style={sectionLabel}>Calendars</div>
          {(calendars.length ? calendars : [{ id: "local-calendar", summary: "Calendar", color: accent, primary: true }]).map((cal) => {
            const off = hiddenCals.includes(cal.id);
            return (
              <Hoverable key={cal.id} onClick={() => toggleCalendar(cal.id)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 6px", borderRadius: 7, cursor: "pointer" }} hover={{ background: C.rowHover }}>
                <span style={{ width: 11, height: 11, borderRadius: 3.5, flex: "none", background: off ? "transparent" : cal.color, border: `1.5px solid ${cal.color}` }} />
                <span style={{ flex: 1, fontSize: 12.5, color: off ? C.textFaint2 : C.text4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cal.summary}</span>
              </Hoverable>
            );
          })}
        </>
      )}

      {/* lists */}
      {isInitialHydrating ? (
        <>
          <div style={sectionLabel}>Tasks</div>
          <SidebarSkeletonRow iconSize={8} titleWidth="58%" count />
          <SidebarSkeletonRow iconSize={8} titleWidth="70%" count />
          <SidebarSkeletonRow iconSize={8} titleWidth="42%" count />
        </>
      ) : taskLists.length > 0 && (
        <>
          <div style={sectionLabel}>Tasks</div>
          {taskLists.map((list) => {
            const off = hiddenLists.includes(list.id);
            const dot = CATS[catFromProject(list.title)].dot;
            return (
              <Hoverable key={list.id} onClick={() => toggleList(list.id)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 6px", borderRadius: 7, cursor: "pointer" }} hover={{ background: C.rowHover }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, flex: "none", background: off ? "transparent" : dot, border: `1.5px solid ${dot}` }} />
                <span style={{ flex: 1, fontSize: 12.5, color: off ? C.textFaint2 : C.text5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{list.title}</span>
                <span style={{ fontSize: 11, color: C.textFaint2 }}>{listCounts[list.id] || 0}</span>
              </Hoverable>
            );
          })}
        </>
      )}

      <div style={{ flex: 1 }} />
      <Hoverable as="button" onClick={openCapture} style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, width: "100%", background: C.rowHover, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "8px 10px", color: "#A2A6B0", fontSize: 12.5, cursor: "pointer" }} hover={{ background: "#222630", color: "#fff" }}>
        <Plus />
        New task
        <span className="keycap" style={{ marginLeft: "auto" }}>⌘N</span>
      </Hoverable>
    </div>
  );
}

function Skel({ style }: { style?: CSSProperties }) {
  return <span className="skeleton" style={{ display: "block", borderRadius: 7, ...style }} />;
}

function SidebarSkeletonRow({ iconSize = 11, titleWidth = "72%", metaWidth, count = false }: { iconSize?: number; titleWidth?: string; metaWidth?: string; count?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 6px", minHeight: 28 }}>
      <Skel style={{ width: iconSize, height: iconSize, borderRadius: iconSize <= 8 ? 2 : 4, flex: "none" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Skel style={{ width: titleWidth, height: 12 }} />
        {metaWidth && <Skel style={{ width: metaWidth, height: 9, marginTop: 5 }} />}
      </div>
      {count && <Skel style={{ width: 18, height: 11, flex: "none" }} />}
    </div>
  );
}

function Toggle({ on, accent }: { on: boolean; accent: string }) {
  return (
    <span style={{ width: 30, height: 18, borderRadius: 20, flex: "none", position: "relative", transition: "background .15s", background: on ? accent : "#3A3D45" }}>
      <span style={{ position: "absolute", top: 2, left: on ? 14 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
    </span>
  );
}
