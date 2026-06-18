import { useMemo, type PointerEvent } from "react";
import { ACCENT_FG, C, CATS } from "../theme";
import { useApp } from "../store/app";
import { buildRail, chipLabelFor, nowFocus, type RailRow } from "../store/selectors";
import { fmtDur } from "../lib/format";
import { Hoverable } from "./Hoverable";
import { Check, Mail } from "./Icon";

function FocusBar() {
  const accent = useApp((s) => s.accent);
  const tasks = useApp((s) => s.tasks);
  const events = useApp((s) => s.events);
  const now = useApp((s) => s.now);
  const today = useApp((s) => s.today);
  const showEmail = useApp((s) => s.showEmail);
  const hiddenLists = useApp((s) => s.hiddenLists);
  const placeTask = useApp((s) => s.placeTask);

  const f = useMemo(() => nowFocus({ tasks, events, now, today, showEmail, hiddenLists }), [tasks, events, now, today, showEmail, hiddenLists]);
  const heading = { in: "Now", next: "Up next", do: "Do now", clear: "Clear" }[f.kind];
  const tint = f.kind === "in" ? "#57C77E" : f.kind === "do" ? accent : f.kind === "clear" ? C.textFaint2 : C.textMute;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, padding: "9px 11px", background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: 10 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: tint, flex: "none" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: tint }}>{heading}</div>
        <div style={{ fontSize: 13, color: C.text3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {f.title}
          {f.sub && <span style={{ color: C.textMute2 }}> · {f.sub}</span>}
        </div>
      </div>
      {f.kind === "do" && f.taskId && (
        <Hoverable
          as="button"
          onClick={() => placeTask(f.taskId!, today, Math.min(21 * 60, Math.ceil(now / 15) * 15))}
          style={{ background: accent, color: ACCENT_FG, fontSize: 12, fontWeight: 600, border: "none", borderRadius: 7, padding: "5px 11px", cursor: "pointer", flex: "none" }}
          hover={{ filter: "brightness(0.94)" }}
        >
          Start now
        </Hoverable>
      )}
    </div>
  );
}

function Row({ row, accent }: { row: RailRow; accent: string }) {
  const startTaskDrag = useApp((s) => s.startTaskDrag);
  const toggleTask = useApp((s) => s.toggleTask);
  const c = CATS[row.cat] || CATS.work;

  const onCheck = (e: PointerEvent) => {
    e.stopPropagation();
    toggleTask(row.id);
  };

  const onDragDown = (e: PointerEvent) => {
    startTaskDrag({ id: row.id, title: row.title, est: row.est, cat: row.cat, done: row.done }, e.clientX, e.clientY);
  };

  const showDayChip = ["tomorrow", "thisweek", "nextweek", "later"].includes(row.bucket);

  return (
    <Hoverable style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 8px", borderRadius: 8 }} hover={{ background: C.rowHover }}>
      <div
        onClick={onCheck as any}
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          flex: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...(row.done ? { background: c.dot, border: `1.5px solid ${c.dot}` } : { border: "1.6px solid #4A4E58" }),
        }}
      >
        {row.done && <Check />}
      </div>

      <div onPointerDown={onDragDown} style={{ flex: 1, minWidth: 0, cursor: "grab" }}>
        <div style={{ fontSize: 13, color: row.done ? "#62656E" : C.text2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: row.done ? "line-through" : "none" }}>{row.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
          {showDayChip && (
            <span style={{ fontSize: 10.5, fontWeight: 600, flex: "none", color: accent, background: "rgba(255,122,69,0.13)", borderRadius: 5, padding: "1px 6px" }}>{chipLabelFor(row.bucket, row.due)}</span>
          )}
          {row.isEmail && <Mail size={11} />}
          {row.showDot && <span style={{ width: 7, height: 7, borderRadius: 2, flex: "none", background: c.dot }} />}
          <span style={{ fontSize: 11, color: C.textMute2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.meta}</span>
          {row.dueLabel && <span style={{ fontSize: 11, color: C.overdue, whiteSpace: "nowrap", flex: "none" }}>· {row.dueLabel}</span>}
          {row.scheduled && <span style={{ fontSize: 10.5, color: "#9C8CFF", whiteSpace: "nowrap", flex: "none" }}>· blocked ✓</span>}
        </div>
      </div>

      <span style={{ fontSize: 11, color: C.textMute3, flex: "none" }}>{fmtDur(row.est)}</span>
    </Hoverable>
  );
}

export function TaskRail() {
  const accent = useApp((s) => s.accent);
  const tasks = useApp((s) => s.tasks);
  const showEmail = useApp((s) => s.showEmail);
  const now = useApp((s) => s.now);
  const today = useApp((s) => s.today);
  const hiddenLists = useApp((s) => s.hiddenLists);
  const archivedShown = useApp((s) => s.archivedShown);
  const toggleArchived = useApp((s) => s.toggleArchived);
  const toggleTask = useApp((s) => s.toggleTask);
  const rollOverdue = useApp((s) => s.rollOverdue);

  const { sections, archived } = useMemo(
    () => buildRail({ tasks, showEmail, now, today, hiddenLists }),
    [tasks, showEmail, now, today, hiddenLists]
  );

  return (
    <div style={{ width: 352, flex: "none", background: C.windowBg, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 18px 14px", flex: "none", borderBottom: `1px solid ${C.borderSoft}` }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em", color: C.text }}>Tasks</div>
        <FocusBar />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "6px 12px 24px" }}>
        {sections.map((sec) => (
          <div key={sec.label}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "12px 8px 5px" }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase", color: sec.color || C.textMute2 }}>{sec.label}</span>
              <span style={{ fontSize: 11, color: sec.color || C.textMute2, background: sec.color ? "rgba(229,115,107,0.14)" : "rgba(255,255,255,0.07)", borderRadius: 20, padding: "1px 7px" }}>{sec.rows.length}</span>
              {sec.label === "Overdue" && (
                <Hoverable as="button" onClick={rollOverdue} title="Move overdue tasks to today" style={{ marginLeft: "auto", background: "none", border: "none", color: C.overdue, fontSize: 11, cursor: "pointer" }} hover={{ color: "#fff" }}>
                  → Today
                </Hoverable>
              )}
            </div>
            {sec.rows.map((row) => (
              <Row key={row.key} row={row} accent={accent} />
            ))}
          </div>
        ))}

        {archived.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "16px 8px 5px" }}>
              <Check size={13} stroke="#57C77E" sw={2} />
              <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase", color: "#57C77E" }}>Completed</span>
              <span style={{ fontSize: 11, color: "#57C77E", background: "rgba(87,199,126,0.14)", borderRadius: 20, padding: "1px 7px" }}>{archived.length}</span>
              <Hoverable as="button" onClick={toggleArchived} style={{ marginLeft: "auto", background: "none", border: "none", color: C.textMute3, fontSize: 11, cursor: "pointer" }} hover={{ color: "#fff" }}>
                {archivedShown ? "Hide" : "Show"}
              </Hoverable>
            </div>
            {archivedShown &&
              archived.map((row) => {
                const c = CATS[row.cat] || CATS.work;
                return (
                  <Hoverable key={row.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 8px", borderRadius: 8, opacity: 0.7 }} hover={{ background: C.rowHover }}>
                    <div onClick={() => toggleTask(row.id)} style={{ width: 18, height: 18, borderRadius: "50%", flex: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: c.dot, border: `1.5px solid ${c.dot}` }}>
                      <Check />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "#62656E", textDecoration: "line-through", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.title}</div>
                      {row.completedLabel && <div style={{ fontSize: 10.5, color: "#57C77E", marginTop: 2 }}>Completed {row.completedLabel}</div>}
                    </div>
                    <span style={{ fontSize: 11, color: C.textMute3, flex: "none" }}>{fmtDur(row.est)}</span>
                  </Hoverable>
                );
              })}
          </div>
        )}

        <div style={{ textAlign: "center", fontSize: 11, color: C.textFaint3, padding: "18px 0 4px" }}>Drag onto the calendar to time-block · drag a block to move or resize</div>
      </div>
    </div>
  );
}
