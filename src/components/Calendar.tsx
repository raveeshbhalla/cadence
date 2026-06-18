import { useMemo, type PointerEvent } from "react";
import { ACCENT_FG, C, CATS, END_HOUR, START_HOUR, pxPerHour } from "../theme";
import type { DropTarget, GridItem, SelDragState } from "../types";
import { fmtDur, fmtTime } from "../lib/format";
import { dayOfMonth, monthLabel, weekdayShort } from "../lib/dates";
import { pack } from "../lib/pack";
import { dayLoad } from "../store/selectors";
import { displayedDays, useApp } from "../store/app";
import { Hoverable } from "./Hoverable";
import { ChevronLeft, ChevronRight } from "./Icon";

interface PositionedItem {
  item: GridItem;
  top: number;
  height: number;
  left: string;
  width: string;
}

function colRect(e: PointerEvent): number {
  const col = (e.currentTarget as HTMLElement).closest("[data-daycol]") as HTMLElement | null;
  return col ? col.getBoundingClientRect().top : 0;
}

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return `rgba(91,155,255,${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function GridBlock({ pi }: { pi: PositionedItem }) {
  const startEventDrag = useApp((s) => s.startEventDrag);
  const startResize = useApp((s) => s.startResize);
  const toggleTask = useApp((s) => s.toggleTask);
  const present = useApp((s) => s.presentMode);
  const { item } = pi;
  const shownTitle = present ? (item.checkable ? "Task" : "Busy") : item.title;
  // Meetings colour by their calendar; task blocks by category.
  const c = item.color ? { fill: hexToRgba(item.color, 0.18), bar: item.color, text: "#EDEEF1" } : CATS[item.cat] || CATS.work;

  const onBodyDown = (e: PointerEvent) => {
    e.stopPropagation();
    startEventDrag(item, e.clientY, e.clientX, e.clientY, colRect(e));
  };
  const onResize = (edge: "top" | "bottom") => (e: PointerEvent) => {
    e.stopPropagation();
    startResize(item, edge, colRect(e));
  };

  return (
    <div
      onPointerDown={onBodyDown}
      style={{
        position: "absolute",
        top: pi.top,
        height: pi.height,
        left: pi.left,
        width: pi.width,
        background: c.fill,
        borderLeft: `3px solid ${c.bar}`,
        borderRadius: 7,
        padding: "3px 7px",
        boxSizing: "border-box",
        overflow: "hidden",
        color: c.text,
        fontSize: 11.5,
        lineHeight: 1.25,
        opacity: item.done ? 0.42 : 1,
        textDecoration: item.done ? "line-through" : "none",
        zIndex: 2,
        cursor: "grab",
      }}
    >
      <div onPointerDown={onResize("top")} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 7, cursor: "ns-resize", zIndex: 4 }} />
      <div onPointerDown={onResize("bottom")} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 7, cursor: "ns-resize", zIndex: 4 }} />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
        {item.checkable && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              toggleTask(item.id);
            }}
            style={{ width: 13, height: 13, border: "1.5px solid currentColor", borderRadius: 4, flex: "none", marginTop: 1, opacity: 0.65, cursor: "pointer", position: "relative", zIndex: 6, background: item.done ? "currentColor" : "transparent" }}
          />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.conflict && <span title="Overlaps another meeting" style={{ color: C.overdue, marginRight: 3 }}>⚠</span>}
            {shownTitle}
          </div>
          <div style={{ opacity: 0.72, fontSize: 10, whiteSpace: "nowrap" }}>{fmtTime(item.start)} · {fmtDur(item.end - item.start)}</div>
        </div>
      </div>
    </div>
  );
}

function DayColumn({
  di,
  positioned,
  accent,
  dragging,
  ghost,
  sel,
  isToday,
  nowTop,
  maskH,
  px,
  avail,
}: {
  di: number;
  positioned: PositionedItem[];
  accent: string;
  dragging: boolean;
  ghost: DropTarget | null;
  sel: SelDragState | null;
  isToday: boolean;
  nowTop: number;
  maskH: number;
  px: number;
  avail: { sl: { date: string; start: number; end: number }; i: number }[];
}) {
  const startSelDrag = useApp((s) => s.startSelDrag);
  const removeSlot = useApp((s) => s.removeAvailabilitySlot);
  const onDown = (e: PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    startSelDrag(di, e.clientY, r.top);
  };

  return (
    <div
      data-daycol={di}
      onPointerDown={onDown}
      style={{ flex: 1, position: "relative", borderLeft: `1px solid ${C.hairline}`, background: isToday ? "rgba(255,255,255,0.018)" : undefined }}
    >
      {positioned.map((pi) => (
        <GridBlock key={pi.item.id} pi={pi} />
      ))}

      {avail.map(({ sl, i }) => (
        <div
          key={i}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => removeSlot(i)}
          title="Click to remove"
          style={{
            position: "absolute",
            left: 2,
            right: 2,
            top: (sl.start / 60 - START_HOUR) * px,
            height: Math.max(((sl.end - sl.start) / 60) * px, 18),
            background: hexToRgba(accent, 0.22),
            border: `1.5px dashed ${accent}`,
            borderRadius: 7,
            zIndex: 7,
            cursor: "pointer",
            color: accent,
            fontSize: 10.5,
            fontWeight: 600,
            padding: "3px 7px",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          {fmtTime(sl.start)}–{fmtTime(sl.end)}
        </div>
      ))}

      {dragging && maskH > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: maskH, background: "rgba(7,8,10,0.66)", zIndex: 5, pointerEvents: "none", display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
          <span style={{ fontSize: 9.5, color: C.textFaint, marginTop: 6, letterSpacing: "0.08em" }}>PAST</span>
        </div>
      )}

      {ghost && (
        <div
          style={{
            position: "absolute",
            left: 2,
            right: 2,
            top: (ghost.start / 60 - START_HOUR) * px,
            height: Math.max((ghost.dur / 60) * px, 18),
            background: (CATS[ghost.cat] || CATS.work).fill,
            border: `1.5px dashed ${ghost.valid ? (CATS[ghost.cat] || CATS.work).bar : C.overdue}`,
            borderRadius: 7,
            zIndex: 6,
            pointerEvents: "none",
          }}
        />
      )}

      {sel && (
        <div
          style={{
            position: "absolute",
            left: 2,
            right: 2,
            top: Math.min(sel.y0, sel.curY) - sel.rectTop,
            height: Math.abs(sel.curY - sel.y0),
            background: "rgba(255,255,255,0.05)",
            border: `1.5px dashed ${accent}`,
            borderRadius: 6,
            zIndex: 4,
            pointerEvents: "none",
          }}
        />
      )}

      {isToday && (
        <div style={{ position: "absolute", left: 0, right: 0, top: nowTop, height: 0, borderTop: `2px solid ${accent}`, zIndex: 8, pointerEvents: "none" }}>
          <div style={{ position: "absolute", left: -3, top: -4, width: 7, height: 7, borderRadius: "50%", background: accent }} />
        </div>
      )}
    </div>
  );
}

export function Calendar() {
  const accent = useApp((s) => s.accent);
  const events = useApp((s) => s.events);
  const allDayEvents = useApp((s) => s.allDayEvents);
  const tasks = useApp((s) => s.tasks);
  const hiddenCals = useApp((s) => s.hiddenCals);
  const hiddenLists = useApp((s) => s.hiddenLists);
  const density = useApp((s) => s.density);
  const now = useApp((s) => s.now);
  const today = useApp((s) => s.today);
  const showEmail = useApp((s) => s.showEmail);
  const viewMonday = useApp((s) => s.viewMonday);
  const view = useApp((s) => s.view);
  const focusDay = useApp((s) => s.focusDay);
  const showWeekends = useApp((s) => s.showWeekends);
  const setView = useApp((s) => s.setView);
  const present = useApp((s) => s.presentMode);
  const togglePresent = useApp((s) => s.togglePresent);
  const dropTarget = useApp((s) => s.dropTarget);
  const selDrag = useApp((s) => s.selDrag);
  const availabilitySlots = useApp((s) => s.availabilitySlots);
  const dragActive = useApp((s) => !!(s.drag && s.drag.active));
  const eventDragActive = useApp((s) => !!(s.eventDrag && s.eventDrag.active));
  const prev = useApp((s) => s.prevWeek);
  const next = useApp((s) => s.nextWeek);
  const gotoToday = useApp((s) => s.gotoToday);

  const px = pxPerHour(density);
  const dragging = dragActive || eventDragActive;
  const week = useMemo(() => displayedDays({ view, focusDay, viewMonday, showWeekends }), [view, focusDay, viewMonday, showWeekends]);
  const availByDay = useMemo(
    () => week.map((date) => availabilitySlots.map((sl, i) => ({ sl, i })).filter((x) => x.sl.date === date)),
    [week, availabilitySlots]
  );
  const gridHeight = (END_HOUR - START_HOUR) * px;
  const nowTop = (now / 60 - START_HOUR) * px;

  const hours = useMemo(() => {
    const arr: { label: string; topPx: number; labelTop: number }[] = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) arr.push({ label: fmtTime(h * 60), topPx: (h - START_HOUR) * px, labelTop: (h - START_HOUR) * px - 6 });
    return arr;
  }, [px]);

  // Unified grid items: meetings + scheduled tasks (one record each).
  const perDay = useMemo(() => {
    const items: GridItem[] = [
      ...events
        .filter((e) => !e.calendarId || !hiddenCals.includes(e.calendarId))
        .map((e) => ({ id: e.id, date: e.date, start: e.start, end: e.end, title: e.title, cat: e.cat, color: e.color, checkable: false, done: false })),
      ...tasks
        .filter((t) => t.block && !(t.listId && hiddenLists.includes(t.listId)))
        .map((t) => ({ id: t.id, date: t.block!.date, start: t.block!.start, end: t.block!.end, title: t.title, cat: t.cat, checkable: true, done: t.status === "completed" })),
    ];

    return week.map((date) => {
      const dayItems = items.filter((it) => it.date === date);
      // Mark meetings that overlap another meeting (double-booked).
      const meetings = dayItems.filter((it) => !it.checkable);
      for (const a of meetings)
        if (meetings.some((b) => b !== a && b.start < a.end && b.end > a.start)) a.conflict = true;
      const pk = pack(dayItems);
      return dayItems.map((item) => {
        const pos = pk[item.id] || { col: 0, cols: 1 };
        return {
          item,
          top: (item.start / 60 - START_HOUR) * px,
          height: Math.max(((item.end - item.start) / 60) * px, 18),
          left: `calc(${(pos.col * 100) / pos.cols}% + 2px)`,
          width: `calc(${100 / pos.cols}% - 5px)`,
        } as PositionedItem;
      });
    });
  }, [events, tasks, hiddenCals, hiddenLists, px, week]);

  const switchPill = (label: string, active: boolean, onClick: () => void) => (
    <span onClick={onClick} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, cursor: "pointer", color: active ? ACCENT_FG : C.textFaint, fontWeight: active ? 600 : 400, background: active ? accent : "transparent" }}>{label}</span>
  );

  const midDay = week[Math.floor((week.length - 1) / 2)] || today;
  const [monthName, yearStr] = monthLabel(midDay).split(" ");
  const load = useMemo(() => dayLoad({ tasks, events, now, today, showEmail, hiddenLists }), [tasks, events, now, today, showEmail, hiddenLists]);
  const conflicts = useMemo(() => perDay.reduce((n, day) => n + day.filter((pi) => pi.item.conflict).length, 0), [perDay]);
  const allDayByDay = useMemo(
    () => week.map((date) => allDayEvents.filter((a) => a.date === date && !(a.calendarId && hiddenCals.includes(a.calendarId)))),
    [week, allDayEvents, hiddenCals]
  );
  const hasAllDay = allDayByDay.some((d) => d.length > 0);

  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: C.calendarBg }}>
      {/* header */}
      <div style={{ height: 52, flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px", borderBottom: `1px solid ${C.borderSoft}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em", color: C.text }}>
            {monthName} <span style={{ color: C.textMute3, fontWeight: 500 }}>{yearStr}</span>
          </span>
          <div style={{ display: "flex", gap: 2 }}>
            <Hoverable as="button" onClick={prev} style={{ background: C.titlebarBg, border: "1px solid rgba(255,255,255,0.07)", borderRadius: "7px 0 0 7px", color: "#A2A6B0", cursor: "pointer", padding: "5px 8px" }} hover={{ background: "#222630" }}>
              <ChevronLeft />
            </Hoverable>
            <Hoverable as="button" onClick={gotoToday} style={{ background: C.titlebarBg, border: "1px solid rgba(255,255,255,0.07)", borderLeft: "none", borderRight: "none", color: C.text3, cursor: "pointer", padding: "5px 12px", fontSize: 12.5, fontWeight: 500 }} hover={{ background: "#222630" }}>
              Today
            </Hoverable>
            <Hoverable as="button" onClick={next} style={{ background: C.titlebarBg, border: "1px solid rgba(255,255,255,0.07)", borderRadius: "0 7px 7px 0", color: "#A2A6B0", cursor: "pointer", padding: "5px 8px" }} hover={{ background: "#222630" }}>
              <ChevronRight />
            </Hoverable>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {present && (
            <span onClick={togglePresent} title="Titles hidden — click to exit" style={{ fontSize: 11.5, fontWeight: 600, color: ACCENT_FG, background: accent, borderRadius: 20, padding: "3px 10px", cursor: "pointer" }}>
              🔒 Presenting
            </span>
          )}
          {conflicts > 0 && (
            <span title="Overlapping meetings this week" style={{ fontSize: 11.5, fontWeight: 600, color: C.overdue, background: "rgba(229,115,107,0.14)", borderRadius: 20, padding: "3px 9px" }}>
              ⚠ {conflicts} overlap{conflicts > 1 ? "s" : ""}
            </span>
          )}
          <span
            title="Today: work still to schedule vs. free time left"
            style={{ fontSize: 11.5, fontWeight: 600, borderRadius: 20, padding: "3px 9px", color: load.overflow ? C.overdue : C.textMute, background: load.overflow ? "rgba(229,115,107,0.14)" : "rgba(255,255,255,0.05)" }}
          >
            {load.overflow ? load.overflowLabel : `${load.freeLabel} free today`}
          </span>
          <div style={{ display: "flex", gap: 4, background: C.titlebarBg, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: 2 }}>
            {switchPill("Day", view === "day", () => setView("day"))}
            {switchPill("Week", view === "week", () => setView("week"))}
          </div>
        </div>
      </div>

      {/* day headers */}
      <div style={{ flex: "none", display: "flex", borderBottom: `1px solid ${C.borderSoft}`, background: C.calendarBg }}>
        <div style={{ width: 56, flex: "none", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 6 }}>
          <span style={{ fontSize: 10, color: C.textFaint2 }}>{tzAbbrev()}</span>
        </div>
        {week.map((key) => {
          const isToday = key === today;
          return (
            <div key={key} style={{ flex: 1, textAlign: "center", padding: "8px 0 7px" }}>
              <div style={{ fontSize: 11, color: C.textMute3, letterSpacing: "0.03em" }}>{weekdayShort(key)}</div>
              <div
                style={
                  isToday
                    ? { fontSize: 18, fontWeight: 700, marginTop: 2, color: ACCENT_FG, background: accent, width: 30, height: 30, lineHeight: "30px", borderRadius: "50%", display: "inline-block" }
                    : { fontSize: 18, fontWeight: 700, marginTop: 2, color: C.text3 }
                }
              >
                {dayOfMonth(key)}
              </div>
            </div>
          );
        })}
      </div>

      {/* all-day banner lane */}
      {hasAllDay && (
        <div style={{ flex: "none", display: "flex", borderBottom: `1px solid ${C.borderSoft}`, background: C.calendarBg, minHeight: 26 }}>
          <div style={{ width: 56, flex: "none", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8 }}>
            <span style={{ fontSize: 9.5, color: C.textFaint2, letterSpacing: "0.04em" }}>all-day</span>
          </div>
          {allDayByDay.map((items, di) => (
            <div key={di} style={{ flex: 1, borderLeft: `1px solid ${C.hairline}`, padding: "3px 3px", display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              {items.slice(0, 2).map((a) => {
                const col = a.color || "#5B9BFF";
                return (
                  <div key={a.id} style={{ fontSize: 10.5, fontWeight: 500, color: "#EDEEF1", background: hexToRgba(col, 0.2), borderLeft: `2px solid ${col}`, borderRadius: 4, padding: "1px 5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {present ? "Busy" : a.title}
                  </div>
                );
              })}
              {items.length > 2 && <span style={{ fontSize: 9.5, color: C.textFaint, paddingLeft: 4 }}>+{items.length - 2} more</span>}
            </div>
          ))}
        </div>
      )}

      {/* grid */}
      <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        <div style={{ position: "relative", height: gridHeight }}>
          {hours.map((hr, i) => (
            <div key={i}>
              <div style={{ position: "absolute", left: 56, right: 0, borderTop: `1px solid ${C.hairline}`, top: hr.topPx }} />
              <div style={{ position: "absolute", left: 0, width: 52, textAlign: "right", fontSize: 10.5, color: C.textFaint2, top: hr.labelTop }}>{hr.label}</div>
            </div>
          ))}
          <div style={{ position: "absolute", left: 56, right: 0, top: 0, bottom: 0, display: "flex" }}>
            {week.map((date, di) => {
              const isToday = date === today;
              const isPastDay = date < today;
              const maskH = isPastDay ? gridHeight : isToday ? Math.max(0, Math.min(gridHeight, nowTop)) : 0;
              return (
                <DayColumn
                  key={date}
                  di={di}
                  positioned={perDay[di]}
                  px={px}
                  accent={accent}
                  dragging={dragging}
                  isToday={isToday}
                  nowTop={nowTop}
                  maskH={maskH}
                  ghost={dropTarget && dropTarget.di === di ? dropTarget : null}
                  sel={selDrag && selDrag.di === di ? selDrag : null}
                  avail={availByDay[di]}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function tzAbbrev(): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value || "";
  } catch {
    return "";
  }
}
