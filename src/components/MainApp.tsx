import { useEffect, useRef } from "react";
import { C } from "../theme";
import { fmtTime } from "../lib/format";
import { diffDays, weekdayShort } from "../lib/dates";
import { api, isTauri } from "../lib/api";
import { useApp } from "../store/app";
import { usePointerHandlers } from "../store/usePointerHandlers";
import { Titlebar } from "./Titlebar";
import { Sidebar } from "./Sidebar";
import { Calendar } from "./Calendar";
import { TaskRail } from "./TaskRail";
import { Capture } from "./Capture";
import { CommandPalette } from "./CommandPalette";
import { Settings } from "./Settings";
import { Shortcuts } from "./Shortcuts";
import { GoToDate } from "./GoToDate";
import { Search } from "./Search";
import { TaskEditor } from "./TaskEditor";
import { EventDetails } from "./EventDetails";
import { AvailabilityPanel } from "./AvailabilityPanel";
import { Triage } from "./Triage";
import { Toast } from "./Toast";
import { DragChip } from "./DragChip";

export function MainApp() {
  usePointerHandlers();
  const sidebarHidden = useApp((s) => s.sidebarHidden);
  const modal = useApp((s) => s.modal);
  const editorId = useApp((s) => s.editorId);
  const eventDetailsId = useApp((s) => s.eventDetailsId);
  const availabilityMode = useApp((s) => s.availabilityMode);
  const triageMode = useApp((s) => s.triageMode);
  const tickNow = useApp((s) => s.tickNow);
  const events = useApp((s) => s.events);
  const tasks = useApp((s) => s.tasks);
  const now = useApp((s) => s.now);
  const today = useApp((s) => s.today);
  const presentMode = useApp((s) => s.presentMode);

  // Keep the now-line and date buckets current.
  useEffect(() => {
    const id = setInterval(tickNow, 20000);
    return () => clearInterval(id);
  }, [tickNow]);

  // Fire a native notification a few minutes before today's meetings/blocks.
  const notified = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isTauri) return;
    const lead = 5; // minutes before
    const upcoming = [
      ...events.filter((e) => e.date === today).map((e) => ({ id: e.id, start: e.start, title: e.title, where: e.location })),
      ...tasks.filter((t) => t.block && t.block.date === today && t.status !== "completed").map((t) => ({ id: t.id, start: t.block!.start, title: t.title, where: undefined as string | undefined })),
    ];
    for (const it of upcoming) {
      const mins = it.start - now;
      if (mins <= lead && mins > -2 && !notified.current.has(it.id)) {
        notified.current.add(it.id);
        api.notify(it.title, mins <= 0 ? "Starting now" : `In ${mins} min${it.where ? " · " + it.where : ""}`);
      }
    }
  }, [events, tasks, now, today]);

  // Tray menu items signal the webview: join the next meeting, or open an item.
  useEffect(() => {
    if (!isTauri) return;
    const unlisteners: (() => void)[] = [];
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen("join-next", () => useApp.getState().joinNextMeeting()).then((f) => unlisteners.push(f));
      // A clicked agenda row: "event:<id>" → details, "task:<id>" → editor.
      listen<string>("tray-open-item", (e) => {
        const raw = e.payload;
        const sep = raw.indexOf(":");
        const kind = raw.slice(0, sep);
        const id = raw.slice(sep + 1);
        const s = useApp.getState();
        if (kind === "event") s.openEventDetails(id);
        else if (kind === "task") s.openEditor(id);
      }).then((f) => unlisteners.push(f));
    });
    return () => unlisteners.forEach((f) => f());
  }, []);

  // Push the next upcoming item (across all days) to the menu-bar title, and
  // today's full schedule to the menu-bar dropdown (Granola-style).
  useEffect(() => {
    // Absolute minutes relative to "now" so we can sort across days.
    const mk = (kind: "event" | "task", id: string, date: string, start: number, end: number, title: string) => {
      const off = diffDays(date, today) * 1440;
      return { kind, id, abs: off + start, absEnd: off + end, start, end, date, title };
    };
    const all = [
      ...events.map((e) => mk("event", e.id, e.date, e.start, e.end, e.title)),
      ...tasks.filter((t) => t.block && t.status !== "completed").map((t) => mk("task", t.id, t.block!.date, t.block!.start, t.block!.end, t.title)),
    ].sort((a, b) => a.abs - b.abs);

    const clip = (raw: string, n = 44) => (presentMode ? "Busy" : raw.length > n ? raw.slice(0, n - 1) + "…" : raw);

    // Menu-bar title = next upcoming item across all days.
    const n = all.find((it) => it.absEnd > now);
    let title = "";
    let header = "";
    if (n) {
      const mins = n.abs - now;
      const off = diffDays(n.date, today);
      let rel: string;
      if (n.abs <= now) rel = "now";
      else if (mins < 60) rel = `in ${mins}m`;
      else if (off === 0) rel = `at ${fmtTime(n.start)}`;
      else if (off === 1) rel = `tomorrow ${fmtTime(n.start)}`;
      else rel = `${weekdayShort(n.date)} ${fmtTime(n.start)}`;
      title = `${clip(n.title, 40)} · ${rel}`;
      header = n.abs <= now ? `Now · ${clip(n.title)}` : mins < 60 ? `Starts in ${mins}m · ${clip(n.title)}` : `Next ${rel} · ${clip(n.title)}`;
    } else {
      header = "Nothing upcoming";
    }
    api.setTrayTitle(title);

    // Dropdown rows = today's schedule in order. Past items are dimmed with ·.
    const todays = all.filter((it) => diffDays(it.date, today) === 0);
    const rows = todays.map((it) => {
      const done = it.absEnd <= now;
      const onNow = it.abs <= now && it.absEnd > now;
      const mark = onNow ? "▶ " : done ? "· " : "  ";
      return { id: `${it.kind}:${it.id}`, label: `${mark}${fmtTime(it.start)}–${fmtTime(it.end)}  ${clip(it.title)}` };
    });
    api.setTrayAgenda(header, rows);
  }, [events, tasks, now, today, presentMode]);

  return (
    <div className="no-select" style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.windowBg, overflow: "hidden" }}>
      <Titlebar />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {!sidebarHidden && <Sidebar />}
        <Calendar />
        <TaskRail />
      </div>

      <DragChip />
      <Toast />
      {modal === "capture" && <Capture />}
      {modal === "palette" && <CommandPalette />}
      {modal === "settings" && <Settings />}
      {modal === "shortcuts" && <Shortcuts />}
      {modal === "goto" && <GoToDate />}
      {modal === "search" && <Search />}
      {editorId && <TaskEditor />}
      {eventDetailsId && <EventDetails />}
      {availabilityMode && <AvailabilityPanel />}
      {triageMode && <Triage />}
    </div>
  );
}
