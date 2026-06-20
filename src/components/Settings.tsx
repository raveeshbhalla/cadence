import { useState } from "react";
import { ACCENT_FG, ACCENT_OPTIONS, C } from "../theme";
import type { Density } from "../theme";
import { api } from "../lib/api";
import { checkForUpdate, type UpdateInfo } from "../lib/updates";
import { useApp } from "../store/app";
import { Hoverable } from "./Hoverable";
import { Check, SignOutIcon } from "./Icon";
import { overlay } from "./overlay";

const DENSITIES: Density[] = ["cozy", "compact"];

export function Settings() {
  const accent = useApp((s) => s.accent);
  const density = useApp((s) => s.density);
  const showEmail = useApp((s) => s.showEmail);
  const sounds = useApp((s) => s.sounds);
  const account = useApp((s) => s.account);
  const setAccent = useApp((s) => s.setAccent);
  const setDensity = useApp((s) => s.setDensity);
  const toggleEmailSource = useApp((s) => s.toggleEmailSource);
  const toggleSounds = useApp((s) => s.toggleSounds);
  const signOut = useApp((s) => s.signOut);
  const exportData = useApp((s) => s.exportData);
  const lastSync = useApp((s) => s.lastSync);
  const refresh = useApp((s) => s.refresh);
  const closeModal = useApp((s) => s.closeModal);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateError, setUpdateError] = useState("");

  const ago = lastSync ? Math.round((Date.now() - lastSync) / 60000) : null;
  const syncLabel = ago == null ? "not synced yet" : ago < 1 ? "synced just now" : `synced ${ago}m ago`;
  const versionLabel = (v: string) => (v.toLowerCase().startsWith("v") ? v : `v${v}`);
  const updateLabel = updateError || (update ? (update.available ? `${versionLabel(update.latest)} available` : `up to date · ${versionLabel(update.current)}`) : "check GitHub releases");
  const runUpdateCheck = async () => {
    setCheckingUpdate(true);
    setUpdateError("");
    try {
      const next = await checkForUpdate();
      setUpdate(next);
    } catch {
      setUpdateError("couldn’t check GitHub");
    } finally {
      setCheckingUpdate(false);
    }
  };

  const label: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: C.textFaint2 };
  const row: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid ${C.border}` };

  return (
    <div onClick={closeModal} style={overlay("16vh")}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 420, maxWidth: "92vw", background: C.modalBg, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, boxShadow: "0 30px 90px rgba(0,0,0,0.6)", overflow: "hidden", animation: "rise .16s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Settings</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.textFaint2 }}>esc to close</span>
        </div>

        <div style={{ padding: "2px 18px 16px" }}>
          {/* accent */}
          <div style={row}>
            <span style={label}>Accent</span>
            <div style={{ display: "flex", gap: 8 }}>
              {ACCENT_OPTIONS.map((c) => (
                <div key={c} onClick={() => setAccent(c)} style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: c === accent ? `0 0 0 2px ${C.modalBg}, 0 0 0 4px ${c}` : "none" }}>
                  {c === accent && <Check size={11} stroke={ACCENT_FG} sw={3.5} />}
                </div>
              ))}
            </div>
          </div>

          {/* density */}
          <div style={row}>
            <span style={label}>Density</span>
            <div style={{ display: "flex", gap: 4, background: C.titlebarBg, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: 2 }}>
              {DENSITIES.map((d) => (
                <span key={d} onClick={() => setDensity(d)} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, cursor: "pointer", textTransform: "capitalize", color: d === density ? ACCENT_FG : C.textFaint, fontWeight: d === density ? 600 : 400, background: d === density ? accent : "transparent" }}>
                  {d}
                </span>
              ))}
            </div>
          </div>

          {/* sounds */}
          <div style={row}>
            <span style={label}>Completion sound</span>
            <Hoverable onClick={toggleSounds} style={{ width: 30, height: 18, borderRadius: 20, position: "relative", transition: "background .15s", background: sounds ? accent : "#3A3D45", cursor: "pointer" }} hover={{}}>
              <span style={{ position: "absolute", top: 2, left: sounds ? 14 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
            </Hoverable>
          </div>

          {/* gmail */}
          <div style={row}>
            <span style={label}>Gmail · Primary</span>
            <Hoverable onClick={toggleEmailSource} style={{ width: 30, height: 18, borderRadius: 20, position: "relative", transition: "background .15s", background: showEmail ? accent : "#3A3D45", cursor: "pointer" }} hover={{}}>
              <span style={{ position: "absolute", top: 2, left: showEmail ? 14 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
            </Hoverable>
          </div>

          {/* sync */}
          {account && (
            <div style={row}>
              <div>
                <span style={label}>Sync</span>
                <div style={{ fontSize: 11.5, color: C.textFaint, marginTop: 3 }}>{syncLabel}</div>
              </div>
              <Hoverable as="button" onClick={refresh} style={{ background: C.rowHover, border: "1px solid rgba(255,255,255,0.08)", color: C.textMute, fontSize: 12.5, borderRadius: 8, padding: "7px 12px", cursor: "pointer", flex: "none" }} hover={{ background: "#222630", color: "#fff" }}>
                Refresh
              </Hoverable>
            </div>
          )}

          {/* data export */}
          <div style={row}>
            <div>
              <span style={label}>Your data</span>
              <div style={{ fontSize: 11.5, color: C.textFaint, marginTop: 3 }}>Lives in your Google account — export anytime</div>
            </div>
            <Hoverable as="button" onClick={exportData} style={{ background: C.rowHover, border: "1px solid rgba(255,255,255,0.08)", color: C.textMute, fontSize: 12.5, borderRadius: 8, padding: "7px 12px", cursor: "pointer", flex: "none" }} hover={{ background: "#222630", color: "#fff" }}>
              Export
            </Hoverable>
          </div>

          {/* updates */}
          <div style={row}>
            <div>
              <span style={label}>Updates</span>
              <div style={{ fontSize: 11.5, color: C.textFaint, marginTop: 3 }}>{updateLabel}</div>
            </div>
            {update?.available ? (
              <Hoverable as="button" onClick={() => api.openUrl(update.url)} style={{ background: accent, border: "none", color: ACCENT_FG, fontWeight: 600, fontSize: 12.5, borderRadius: 8, padding: "7px 12px", cursor: "pointer", flex: "none" }} hover={{ filter: "brightness(1.08)" }}>
                Open release
              </Hoverable>
            ) : (
              <Hoverable as="button" onClick={() => !checkingUpdate && runUpdateCheck()} style={{ background: C.rowHover, border: "1px solid rgba(255,255,255,0.08)", color: C.textMute, fontSize: 12.5, borderRadius: 8, padding: "7px 12px", cursor: checkingUpdate ? "default" : "pointer", flex: "none" }} hover={checkingUpdate ? {} : { background: "#222630", color: "#fff" }}>
                {checkingUpdate ? "Checking…" : "Check"}
              </Hoverable>
            )}
          </div>

          {/* account / sign out */}
          {account && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11.5, color: C.textFaint2 }}>Signed in as</div>
                <div style={{ fontSize: 13, color: C.text3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{account}</div>
              </div>
              <Hoverable as="button" onClick={signOut} style={{ display: "flex", alignItems: "center", gap: 7, background: C.rowHover, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "7px 12px", color: C.textMute, fontSize: 12.5, cursor: "pointer", flex: "none" }} hover={{ background: "#2A1D1D", color: "#E5736B" }}>
                <SignOutIcon /> Sign out
              </Hoverable>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
