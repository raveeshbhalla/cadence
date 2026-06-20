import { ACCENT_FG } from "../theme";
import { useApp } from "../store/app";
import { usePointer } from "../store/pointer";

/**
 * Floating label that follows the cursor during a drag. Subscribes to the
 * isolated pointer store so cursor-follow never re-renders the rest of the UI.
 */
export function DragChip() {
  const x = usePointer((p) => p.x);
  const y = usePointer((p) => p.y);
  const accent = useApp((s) => s.accent);
  const title = useApp((s) => {
    if (s.drag && s.drag.active) {
      if (s.railDropTarget) return s.railDropTarget.valid ? `${s.drag.payload.title} → ${s.railDropTarget.label}` : `Can’t move to ${s.railDropTarget.label}`;
      return s.drag.payload.title;
    }
    if (s.eventDrag && s.eventDrag.active) return s.eventDrag.title;
    return null;
  });
  if (!title) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        transform: `translate(${x + 14}px, ${y + 10}px)`,
        background: accent,
        color: ACCENT_FG,
        fontSize: 12,
        fontWeight: 600,
        padding: "5px 10px",
        borderRadius: 7,
        pointerEvents: "none",
        zIndex: 9999,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        willChange: "transform",
      }}
    >
      {title}
    </div>
  );
}
