import { useMemo, type CSSProperties } from "react";
import { ACCENT_FG, C, CATS } from "../theme";
import { dayOfMonth, diffDays, monthLabel, monthShort, weekdayShort } from "../lib/dates";
import { fmtDur, fmtTime, overdueLabel } from "../lib/format";
import { taskListKey } from "../lib/taskLists";
import { useApp } from "../store/app";
import type { CalEvent, Task } from "../types";
import { Check, CalendarIcon } from "./Icon";
import { Hoverable } from "./Hoverable";

const FALLBACK_CALENDAR_ID = "local-calendar";

type TimedAgendaItem =
  | { kind: "event"; id: string; start: number; end: number; title: string; color: string; event: CalEvent }
  | { kind: "task"; id: string; start: number; end: number; title: string; color: string; task: Task };

type LooseAgendaItem =
  | { kind: "allDay"; id: string; title: string; color: string; declined: boolean }
  | { kind: "task"; id: string; title: string; color: string; task: Task };

function ViewTabs() {
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);
  const accent = useApp((s) => s.accent);
  const pill = (label: string, active: boolean, onClick: () => void) => (
    <span onClick={onClick} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, cursor: "pointer", color: active ? ACCENT_FG : C.textFaint, fontWeight: active ? 600 : 400, background: active ? accent : "transparent" }}>{label}</span>
  );
  return (
    <div style={{ display: "flex", gap: 4, background: C.titlebarBg, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: 2 }}>
      {pill("Day", view === "day", () => setView("day"))}
      {pill("Week", view === "week", () => setView("week"))}
      {pill("Focus", view === "focus", () => setView("focus"))}
    </div>
  );
}

function TaskCheck({ task }: { task: Task }) {
  const toggleTask = useApp((s) => s.toggleTask);
  const c = CATS[task.cat] || CATS.work;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleTask(task.id);
      }}
      style={{
        width: 19,
        height: 19,
        borderRadius: 6,
        border: `1.5px solid ${task.status === "completed" ? c.dot : "rgba(255,255,255,0.24)"}`,
        background: task.status === "completed" ? c.dot : "transparent",
        color: "#101115",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flex: "none",
      }}
    >
      {task.status === "completed" && <Check />}
    </button>
  );
}

function statusFor(it: TimedAgendaItem, now: number): { label: string; style: CSSProperties } {
  if (it.end <= now) return { label: "Done", style: { color: C.textFaint2, background: "rgba(255,255,255,0.04)" } };
  if (it.start <= now && now < it.end) return { label: "Now", style: { color: "#57C77E", background: "rgba(87,199,126,0.12)" } };
  const mins = it.start - now;
  if (mins > 0 && mins <= 60) return { label: `In ${mins}m`, style: { color: C.text, background: "rgba(255,255,255,0.06)" } };
  return { label: fmtTime(it.start), style: { color: C.textMute2, background: "rgba(255,255,255,0.04)" } };
}

export function FocusView() {
  const accent = useApp((s) => s.accent);
  const events = useApp((s) => s.events);
  const allDayEvents = useApp((s) => s.allDayEvents);
  const tasks = useApp((s) => s.tasks);
  const hiddenCals = useApp((s) => s.hiddenCals);
  const hiddenLists = useApp((s) => s.hiddenLists);
  const showEmail = useApp((s) => s.showEmail);
  const today = useApp((s) => s.today);
  const now = useApp((s) => s.now);
  const present = useApp((s) => s.presentMode);
  const openEditor = useApp((s) => s.openEditor);
  const openEventDetails = useApp((s) => s.openEventDetails);
  const isInitialHydrating = useApp((s) => s.isHydrating && !s.lastSync);

  const { timed, loose } = useMemo(() => {
    const visibleTask = (t: Task) => {
      const key = taskListKey(t);
      if (key && hiddenLists.includes(key)) return false;
      if (t.source === "gmail" && !showEmail) return false;
      return true;
    };

    const timedItems: TimedAgendaItem[] = [
      ...events
        .filter((e) => e.date === today && !hiddenCals.includes(e.calendarId || FALLBACK_CALENDAR_ID))
        .map((e) => ({ kind: "event" as const, id: e.id, start: e.start, end: e.end, title: e.title, color: e.color || "#5B9BFF", event: e })),
      ...tasks
        .filter((t) => t.block && t.block.date === today && visibleTask(t))
        .map((t) => {
          const c = CATS[t.cat] || CATS.work;
          return { kind: "task" as const, id: t.id, start: t.block!.start, end: t.block!.end, title: t.title, color: c.bar, task: t };
        }),
    ].sort((a, b) => a.start - b.start || a.end - b.end || (a.kind === "event" ? -1 : 1));

    const looseItems: LooseAgendaItem[] = [
      ...allDayEvents
        .filter((a) => a.date === today && !hiddenCals.includes(a.calendarId || FALLBACK_CALENDAR_ID))
        .map((a) => ({ kind: "allDay" as const, id: a.id, title: a.title, color: a.color || "#5B9BFF", declined: a.responseStatus === "declined" })),
      ...tasks
        .filter((t) => t.status !== "completed" && !t.block && visibleTask(t) && (t.due == null || t.due <= today))
        .sort((a, b) => {
          if (a.due == null && b.due != null) return 1;
          if (a.due != null && b.due == null) return -1;
          return (a.due || "").localeCompare(b.due || "") || b.est - a.est;
        })
        .map((t) => {
          const c = CATS[t.cat] || CATS.work;
          return { kind: "task" as const, id: t.id, title: t.title, color: c.bar, task: t };
        }),
    ];

    return { timed: timedItems, loose: looseItems };
  }, [allDayEvents, events, hiddenCals, hiddenLists, showEmail, tasks, today]);

  const next = timed.find((it) => it.end > now);
  const completedTasks = tasks.filter((t) => t.status === "completed" && (t.block?.date === today || t.completed?.startsWith("today"))).length;
  const dateTitle = `${weekdayShort(today)}, ${monthShort(today)} ${dayOfMonth(today)}`;
  const [monthName, yearStr] = monthLabel(today).split(" ");

  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: C.calendarBg }}>
      <div style={{ height: 52, flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", borderBottom: `1px solid ${C.borderSoft}` }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em", color: C.text }}>Focus</span>
          <span style={{ fontSize: 13, color: C.textMute }}>{monthName} <span style={{ color: C.textMute3 }}>{yearStr}</span></span>
        </div>
        <ViewTabs />
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <main style={{ width: "min(820px, calc(100vw - 80px))", margin: "0 auto", padding: "34px 0 54px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 28, marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 12, color: accent, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Today</div>
              <h1 style={{ margin: 0, color: C.text, fontSize: 34, lineHeight: 1.05, letterSpacing: "-0.02em" }}>{dateTitle}</h1>
            </div>
            <div style={{ display: "flex", gap: 18, color: C.textMute, fontSize: 12.5, textAlign: "right" }}>
              <div>
                <div style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>{timed.length}</div>
                <div>scheduled</div>
              </div>
              <div>
                <div style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>{loose.length}</div>
                <div>unscheduled</div>
              </div>
              <div>
                <div style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>{completedTasks}</div>
                <div>done</div>
              </div>
            </div>
          </div>

          {isInitialHydrating ? (
            <FocusSkeleton />
          ) : (
            <>
              {next && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: `1px solid ${C.borderSoft}`, borderBottom: `1px solid ${C.borderSoft}`, marginBottom: 18 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: next.color, flex: "none" }} />
                  <span style={{ color: C.textMute, fontSize: 13 }}>{next.start <= now ? "Now" : "Next"}</span>
                  <span style={{ color: C.text, fontSize: 13.5, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{present ? (next.kind === "task" ? "Task" : "Busy") : next.title}</span>
                  <span style={{ marginLeft: "auto", color: C.textMute2, fontSize: 12 }}>{fmtTime(next.start)} - {fmtTime(next.end)}</span>
                </div>
              )}

              <section>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <h2 style={{ margin: 0, color: C.textMute, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Agenda</h2>
                </div>
                <div style={{ borderTop: `1px solid ${C.borderSoft}` }}>
                  {timed.length ? (
                    timed.map((it) => <TimedRow key={`${it.kind}:${it.id}`} item={it} now={now} present={present} onOpen={() => (it.kind === "event" ? openEventDetails(it.id) : openEditor(it.id))} />)
                  ) : (
                    <EmptyLine label="No timed work today" />
                  )}
                </div>
              </section>

              <section style={{ marginTop: 34 }}>
                <h2 style={{ margin: "0 0 10px", color: C.textMute, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>All-day & unscheduled</h2>
                <div style={{ borderTop: `1px solid ${C.borderSoft}` }}>
                  {loose.length ? (
                    loose.map((it) => <LooseRow key={`${it.kind}:${it.id}`} item={it} today={today} present={present} onOpen={() => (it.kind === "task" ? openEditor(it.id) : undefined)} />)
                  ) : (
                    <EmptyLine label="Nothing waiting at the bottom" />
                  )}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function TimedRow({ item, now, present, onOpen }: { item: TimedAgendaItem; now: number; present: boolean; onOpen: () => void }) {
  const status = statusFor(item, now);
  const done = item.kind === "task" && item.task.status === "completed";
  const declined = item.kind === "event" && item.event.responseStatus === "declined";
  const muted = done || declined || item.end <= now;
  return (
    <Hoverable onClick={onOpen} style={{ display: "grid", gridTemplateColumns: "104px 1fr auto", alignItems: "center", gap: 16, minHeight: 62, borderBottom: `1px solid ${C.borderSoft}`, cursor: "pointer", opacity: muted ? 0.52 : 1 }} hover={{ background: "rgba(255,255,255,0.025)" }}>
      <div style={{ color: C.textMute, fontSize: 12.5 }}>
        <div style={{ color: C.text3, fontWeight: 650 }}>{fmtTime(item.start)}</div>
        <div style={{ marginTop: 3 }}>{fmtDur(item.end - item.start)}</div>
      </div>
      <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 11 }}>
        {item.kind === "task" ? <TaskCheck task={item.task} /> : <CalendarIcon size={18} stroke={item.color} />}
        <div style={{ minWidth: 0 }}>
          <div style={{ color: C.text, fontSize: 15, fontWeight: 650, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: muted ? "line-through" : "none" }}>{present ? (item.kind === "task" ? "Task" : "Busy") : item.title}</div>
          <div style={{ color: C.textMute2, fontSize: 12, marginTop: 4 }}>{item.kind === "task" ? item.task.project || "No list" : item.event.location || "Calendar"}</div>
        </div>
      </div>
      <span style={{ ...status.style, fontSize: 11.5, fontWeight: 650, borderRadius: 20, padding: "3px 9px" }}>{status.label}</span>
    </Hoverable>
  );
}

function LooseRow({ item, today, present, onOpen }: { item: LooseAgendaItem; today: string; present: boolean; onOpen?: () => void }) {
  const overdueDays = item.kind === "task" && item.task.due ? diffDays(today, item.task.due) : 0;
  const muted = item.kind === "allDay" && item.declined;
  return (
    <Hoverable onClick={onOpen} style={{ display: "grid", gridTemplateColumns: "104px 1fr auto", alignItems: "center", gap: 16, minHeight: 56, borderBottom: `1px solid ${C.borderSoft}`, cursor: onOpen ? "pointer" : "default", opacity: muted ? 0.48 : 1 }} hover={onOpen ? { background: "rgba(255,255,255,0.025)" } : {}}>
      <div style={{ color: C.textMute2, fontSize: 12.5 }}>{item.kind === "allDay" ? "All day" : item.task.due == null ? "No date" : item.task.due === today ? "Today" : "Overdue"}</div>
      <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 11 }}>
        {item.kind === "task" ? <TaskCheck task={item.task} /> : <CalendarIcon size={18} stroke={item.color} />}
        <div style={{ minWidth: 0 }}>
          <div style={{ color: C.text, fontSize: 14.5, fontWeight: 620, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: muted ? "line-through" : "none" }}>{present ? (item.kind === "task" ? "Task" : "Busy") : item.title}</div>
          {item.kind === "task" && <div style={{ color: C.textMute2, fontSize: 12, marginTop: 4 }}>{item.task.project || "No list"} · {fmtDur(item.task.est)}</div>}
        </div>
      </div>
      {item.kind === "task" && overdueDays > 0 && <span style={{ color: C.overdue, fontSize: 11.5 }}>{overdueLabel(overdueDays)}</span>}
    </Hoverable>
  );
}

function EmptyLine({ label }: { label: string }) {
  return <div style={{ minHeight: 58, display: "flex", alignItems: "center", borderBottom: `1px solid ${C.borderSoft}`, color: C.textFaint2, fontSize: 13 }}>{label}</div>;
}

function FocusSkeleton() {
  return (
    <div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "104px 1fr auto", alignItems: "center", gap: 16, minHeight: 62, borderTop: i === 0 ? `1px solid ${C.borderSoft}` : undefined, borderBottom: `1px solid ${C.borderSoft}` }}>
          <span className="skeleton" style={{ display: "block", width: 58, height: 14, borderRadius: 7 }} />
          <span className="skeleton" style={{ display: "block", width: `${76 - i * 8}%`, height: 16, borderRadius: 7 }} />
          <span className="skeleton" style={{ display: "block", width: 54, height: 20, borderRadius: 20 }} />
        </div>
      ))}
    </div>
  );
}
