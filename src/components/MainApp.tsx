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

  // The tray "Join next meeting" item signals the webview.
  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen("join-next", () => useApp.getState().joinNextMeeting()).then((f) => (unlisten = f));
    });
    return () => unlisten?.();
  }, []);

  // Push the next upcoming item (across all days) to the macOS menu bar.
  useEffect(() => {
    // Absolute minutes relative to "now" so we can sort across days.
    const mk = (date: string, start: number, end: number, title: string) => {
      const off = diffDays(date, today) * 1440;
      return { abs: off + start, absEnd: off + end, start, date, title };
    };
    const items = [
      ...events.map((e) => mk(e.date, e.start, e.end, e.title)),
      ...tasks.filter((t) => t.block && t.status !== "completed").map((t) => mk(t.block!.date, t.block!.start, t.block!.end, t.title)),
    ]
      .filter((it) => it.absEnd > now)
      .sort((a, b) => a.abs - b.abs);

    const n = items[0];
    let label = "";
    if (n) {
      const raw = presentMode ? "Busy" : n.title;
      const title = raw.length > 40 ? raw.slice(0, 39) + "…" : raw;
      const mins = n.abs - now;
      const off = diffDays(n.date, today);
      let rel: string;
      if (n.abs <= now) rel = "now";
      else if (mins < 60) rel = `in ${mins}m`;
      else if (off === 0) rel = `at ${fmtTime(n.start)}`;
      else if (off === 1) rel = `tomorrow ${fmtTime(n.start)}`;
      else rel = `${weekdayShort(n.date)} ${fmtTime(n.start)}`;
      label = `${title} · ${rel}`;
    }
    api.setTrayTitle(label);
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
