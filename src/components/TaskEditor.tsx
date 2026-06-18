import { useEffect, useState, type KeyboardEvent } from "react";
import { C, CATS } from "../theme";
import { fmtDur, fmtTime } from "../lib/format";
import { weekdayShort } from "../lib/dates";
import { useApp } from "../store/app";
import { Hoverable } from "./Hoverable";
import { overlay } from "./overlay";

export function TaskEditor() {
  const editorId = useApp((s) => s.editorId);
  const task = useApp((s) => s.tasks.find((t) => t.id === s.editorId));
  const renameTask = useApp((s) => s.renameTask);
  const deleteTask = useApp((s) => s.deleteTask);
  const unscheduleTask = useApp((s) => s.unscheduleTask);
  const closeEditor = useApp((s) => s.closeEditor);

  const [title, setTitle] = useState("");
  useEffect(() => {
    if (task) setTitle(task.title);
  }, [editorId, task?.title]);

  if (!task) return null;
  const c = CATS[task.cat] || CATS.work;

  const commit = () => {
    if (title.trim() && title.trim() !== task.title) renameTask(task.id, title);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
      closeEditor();
    } else if (e.key === "Escape") closeEditor();
  };

  const block = task.block;
  const metaBits: string[] = [];
  if (task.project) metaBits.push(task.project);
  if (block) metaBits.push(weekdayShort(block.date) + " " + fmtTime(block.start) + "–" + fmtTime(block.end));
  else if (task.source === "gmail" && task.meta) metaBits.push(task.meta);
  metaBits.push(fmtDur(block ? block.end - block.start : task.est));

  return (
    <div onClick={closeEditor} style={overlay("18vh")}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 460, maxWidth: "92vw", background: C.modalBg, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, boxShadow: "0 30px 90px rgba(0,0,0,0.6)", overflow: "hidden", animation: "rise .16s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px 10px" }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: c.dot, flex: "none" }} />
          <span style={{ fontSize: 11.5, color: C.textMute2 }}>{metaBits.join(" · ")}</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.textFaint2 }}>esc to close</span>
        </div>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commit}
          onKeyDown={onKey}
          style={{ width: "100%", background: "none", border: "none", outline: "none", color: C.text, fontSize: 18, fontWeight: 600, padding: "0 18px 16px" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", background: C.modalFooterBg, borderTop: `1px solid ${C.border}` }}>
          <Hoverable as="button" onClick={() => deleteTask(task.id)} style={{ background: "none", border: "1px solid rgba(229,115,107,0.3)", color: "#E5736B", fontSize: 12.5, fontWeight: 500, borderRadius: 8, padding: "7px 12px", cursor: "pointer" }} hover={{ background: "rgba(229,115,107,0.12)" }}>
            Delete
          </Hoverable>
          {block && (
            <Hoverable as="button" onClick={() => unscheduleTask(task.id)} style={{ background: C.rowHover, border: "1px solid rgba(255,255,255,0.08)", color: C.textMute, fontSize: 12.5, borderRadius: 8, padding: "7px 12px", cursor: "pointer" }} hover={{ background: "#222630", color: "#fff" }}>
              Unschedule
            </Hoverable>
          )}
          <span style={{ flex: 1 }} />
          <button onClick={() => { commit(); closeEditor(); }} style={{ background: useApp.getState().accent, color: "#1A0E07", fontWeight: 600, fontSize: 13, border: "none", borderRadius: 8, padding: "7px 18px", cursor: "pointer" }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
