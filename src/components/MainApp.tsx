import { useEffect } from "react";
import { C } from "../theme";
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
import { Toast } from "./Toast";
import { DragChip } from "./DragChip";

export function MainApp() {
  usePointerHandlers();
  const sidebarHidden = useApp((s) => s.sidebarHidden);
  const modal = useApp((s) => s.modal);
  const editorId = useApp((s) => s.editorId);
  const tickNow = useApp((s) => s.tickNow);

  // Keep the now-line and date buckets current.
  useEffect(() => {
    const id = setInterval(tickNow, 20000);
    return () => clearInterval(id);
  }, [tickNow]);

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
    </div>
  );
}
