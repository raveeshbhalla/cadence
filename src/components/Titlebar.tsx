import { C } from "../theme";
import { useApp } from "../store/app";
import { Hoverable } from "./Hoverable";
import { Gear, Search, SidebarIcon, Sparkle } from "./Icon";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function win(action: "close" | "minimize" | "toggleMaximize") {
  if (!isTauri) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const w = getCurrentWindow();
  if (action === "close") w.close();
  else if (action === "minimize") w.minimize();
  else w.toggleMaximize();
}

function Light({ color, action }: { color: string; action: "close" | "minimize" | "toggleMaximize" }) {
  return (
    <span
      onClick={() => win(action)}
      style={{ width: 12, height: 12, borderRadius: "50%", background: color, cursor: "default" }}
    />
  );
}

export function Titlebar() {
  const accent = useApp((s) => s.accent);
  const toggleSidebar = useApp((s) => s.toggleSidebar);
  const openPalette = useApp((s) => s.openPalette);
  const openSettings = useApp((s) => s.openSettings);

  return (
    <div
      data-tauri-drag-region
      style={{
        height: 44,
        flex: "none",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        background: C.titlebarBg,
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Light color="#FF5F57" action="close" />
        <Light color="#FEBC2E" action="minimize" />
        <Light color="#28C840" action="toggleMaximize" />
      </div>

      <Hoverable
        as="button"
        title="Toggle sidebar"
        onClick={toggleSidebar}
        style={{ marginLeft: 14, background: "none", border: "none", color: C.textMute3, cursor: "pointer", padding: 3, display: "flex" }}
        hover={{ color: "#fff" }}
      >
        <SidebarIcon />
      </Hoverable>

      <div data-tauri-drag-region style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
        <Sparkle fill={accent} />
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", color: C.text4 }}>Cadence</span>
      </div>

      <Hoverable
        as="button"
        onClick={openPalette}
        style={{ display: "flex", alignItems: "center", gap: 8, background: C.chipBg, border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 8, padding: "5px 9px 5px 11px", color: C.textMute, fontSize: 12, cursor: "pointer", minWidth: 190 }}
        hover={{ background: "#262A31" }}
      >
        <Search />
        <span style={{ flex: 1, textAlign: "left" }}>Search or run a command</span>
        <span className="keycap">⌘K</span>
      </Hoverable>

      <Hoverable
        as="button"
        title="Settings"
        onClick={openSettings}
        style={{ marginLeft: 10, background: "none", border: "none", color: C.textMute3, cursor: "pointer", padding: 3, display: "flex" }}
        hover={{ color: "#fff" }}
      >
        <Gear />
      </Hoverable>
    </div>
  );
}
