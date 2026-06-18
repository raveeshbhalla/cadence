import { C } from "../theme";
import { useApp } from "../store/app";
import { Hoverable } from "./Hoverable";

export function Toast() {
  const toast = useApp((s) => s.toast);
  const accent = useApp((s) => s.accent);
  const onUndo = useApp((s) => s.undo);
  if (!toast) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 32,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: C.chipBg,
        border: "1px solid rgba(255,255,255,0.12)",
        color: C.textHi,
        fontSize: 13,
        padding: "9px 11px 9px 18px",
        borderRadius: 10,
        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
        zIndex: 9000,
        animation: "rise .2s ease-out",
      }}
    >
      <span>{toast.msg}</span>
      {toast.undo && (
        <Hoverable as="button" onClick={onUndo} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.1)", border: "none", color: accent, fontWeight: 600, fontSize: 12.5, borderRadius: 7, padding: "5px 11px", cursor: "pointer" }} hover={{ background: "rgba(255,255,255,0.2)" }}>
          Undo <span className="keycap">⌘Z</span>
        </Hoverable>
      )}
    </div>
  );
}
