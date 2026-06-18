import { useEffect } from "react";
import { C } from "../theme";
import { fmtTime } from "../lib/format";
import { api } from "../lib/api";
import { useApp } from "../store/app";
import { usePointerHandlers } from "../store/usePointerHandlers";
import { Titlebar } from "./Titlebar";
import { Sidebar } from "./Sidebar";
import { Calendar } from "./Calendar";
import { TaskRail } from "./TaskRail";
import { Capture } from "./Capture";
import { CommandPalette } from "./CommandPalette";
import { Settings } from "./Settings";
import { TaskEditor } from "./TaskEditor";
import { EventDetails } from "./EventDetails";
import { Toast } from "./Toast";
import { DragChip } from "./DragChip";

export function MainApp() {
  usePointerHandlers();
  const sidebarHidden = useApp((s) => s.sidebarHidden);
  const modal = useApp((s) => s.modal);
  const editorId = useApp((s) => s.editorId);
  const eventDetailsId = useApp((s) => s.eventDetailsId);
  const tickNow = useApp((s) => s.tickNow);
  const events = useApp((s) => s.events);
  const tasks = useApp((s) => s.tasks);
  const now = useApp((s) => s.now);
  const today = useApp((s) => s.today);

  // Keep the now-line and date buckets current.
  useEffect(() => {
    const id = setInterval(tickNow, 20000);
    return () => clearInterval(id);
  }, [tickNow]);

  // Push the next upcoming item today to the macOS menu bar.
  useEffect(() => {
    const items = [
      ...events.filter((e) => e.date === today).map((e) => ({ start: e.start, end: e.end, title: e.title })),
      ...tasks
        .filter((t) => t.block && t.block.date === today && t.status !== "completed")
        .map((t) => ({ start: t.block!.start, end: t.block!.end, title: t.title })),
    ]
      .filter((it) => it.end > now)
      .sort((a, b) => a.start - b.start);
    const n = items[0];
    let label = "";
    if (n) {
      const t = n.title.length > 22 ? n.title.slice(0, 21) + "…" : n.title;
      label = n.start <= now ? `▶ ${t}` : `${t} · ${fmtTime(n.start)}`;
    }
    api.setTrayTitle(label);
  }, [events, tasks, now, today]);

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
      {editorId && <TaskEditor />}
      {eventDetailsId && <EventDetails />}
    </div>
  );
}
