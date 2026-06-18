import { useEffect, useRef, useState } from "react";
import { ACCENT_FG, DEFAULT_ACCENT } from "../theme";
import { ArrowRight, BigCheck, CalendarIcon, CheckList, GoogleG, Mail, Sparkle } from "./Icon";
import { Hoverable } from "./Hoverable";
import { api, isTauri } from "../lib/api";

type Step = "welcome" | "consent" | "connecting" | "done";

const accent = DEFAULT_ACCENT;

function Dots({ idx }: { idx: number }) {
  const dot = (i: number) =>
    i === idx ? accent : i < idx ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.14)";
  return (
    <div style={{ display: "flex", gap: 7, justifyContent: "center", marginTop: 24 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: dot(i), transition: "background .2s" }} />
      ))}
    </div>
  );
}

const cardDark: React.CSSProperties = {
  width: 440,
  maxWidth: "100%",
  background: "#14151B",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 18,
  boxShadow: "0 30px 90px rgba(0,0,0,0.55)",
};

export function Onboarding({ onEnter }: { onEnter: (email: string) => void }) {
  const [step, setStep] = useState<Step>("welcome");
  const [email, setEmail] = useState("alex@gmail.com");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  // Run the real OAuth flow (Tauri). Consent happens in the system browser.
  const startRealSignIn = () => {
    setError(null);
    setStep("connecting");
    api
      .googleSignIn()
      .then((acct) => {
        setEmail(acct.email);
        setStep("done");
      })
      .catch((e) => {
        setError(typeof e === "string" ? e : "Sign-in failed. Please try again.");
        setStep("welcome");
      });
  };

  // Browser preview: walk the mocked consent → connecting → done screens.
  const onContinue = () => (isTauri ? startRealSignIn() : setStep("consent"));
  const allow = () => {
    setStep("connecting");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStep("done"), 1800);
  };

  const idx = step === "welcome" || step === "consent" ? 0 : step === "connecting" ? 1 : 2;

  return (
    <div
      className="no-select"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
        background: "radial-gradient(1100px 640px at 50% -8%, #1B1622 0%, #0B0B10 52%, #08090C 100%)",
      }}
    >
      {/* floating blocks */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "16%", left: "13%", width: 128, height: 54, borderRadius: 9, background: "rgba(217,164,65,0.10)", borderLeft: "3px solid rgba(217,164,65,0.5)", animation: "floaty 7s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "62%", left: "18%", width: 120, height: 70, borderRadius: 9, background: "rgba(91,155,255,0.09)", borderLeft: "3px solid rgba(91,155,255,0.45)", animation: "floaty 8.5s ease-in-out infinite", animationDelay: "-2s" }} />
        <div style={{ position: "absolute", top: "24%", right: "12%", width: 132, height: 62, borderRadius: 9, background: "rgba(156,140,255,0.09)", borderLeft: "3px solid rgba(156,140,255,0.45)", animation: "floaty 9s ease-in-out infinite", animationDelay: "-4s" }} />
        <div style={{ position: "absolute", top: "68%", right: "16%", width: 116, height: 48, borderRadius: 9, background: "rgba(63,182,164,0.09)", borderLeft: "3px solid rgba(63,182,164,0.45)", animation: "floaty 7.8s ease-in-out infinite", animationDelay: "-1s" }} />
      </div>

      {step === "welcome" && (
        <div style={{ ...cardDark, padding: "44px 40px 32px", position: "relative", animation: "stepIn .4s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
            <Sparkle size={26} fill={accent} />
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", color: "#EDEEF1" }}>Cadence</span>
          </div>
          <h1 style={{ fontSize: 27, fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.2, textAlign: "center", color: "#F4F5F7", margin: "26px 0 0" }}>
            Your calendar and tasks,
            <br />
            in one calm place.
          </h1>
          <p style={{ fontSize: 14.5, lineHeight: 1.6, textAlign: "center", color: "#9CA0AA", margin: "14px auto 0", maxWidth: 330 }}>
            Connect your Google account and Cadence pulls in your calendar, tasks and replies — so each morning you plan the day in one view.
          </p>
          <Hoverable
            as="button"
            onClick={onContinue}
            style={{ marginTop: 30, width: "100%", height: 46, display: "flex", alignItems: "center", justifyContent: "center", gap: 11, background: "#fff", color: "#1F1F1F", border: "none", borderRadius: 11, fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}
            hover={{ background: "#F1F1F1" }}
          >
            <GoogleG />
            Continue with Google
          </Hoverable>
          {error && <p style={{ fontSize: 12, lineHeight: 1.5, textAlign: "center", color: "#E5736B", margin: "12px auto 0", maxWidth: 330 }}>{error}</p>}
          <p style={{ fontSize: 11.5, lineHeight: 1.5, textAlign: "center", color: "#5C606A", margin: "16px auto 0", maxWidth: 320 }}>
            Cadence runs locally on your Mac. Your data stays in your Google account — we don't store it on our servers.
          </p>
          <Dots idx={idx} />
        </div>
      )}

      {step === "consent" && (
        <div style={{ width: 420, maxWidth: "100%", background: "#fff", borderRadius: 16, boxShadow: "0 30px 90px rgba(0,0,0,0.55)", overflow: "hidden", color: "#202124", animation: "stepIn .3s ease" }}>
          <div style={{ padding: "26px 32px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <GoogleG size={20} />
              <span style={{ fontSize: 15, color: "#5F6368", fontWeight: 500 }}>Sign in with Google</span>
            </div>
            <h2 style={{ fontSize: 21, fontWeight: 400, color: "#202124", margin: "20px 0 0" }}>
              Cadence wants to access
              <br />
              your Google Account
            </h2>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 16, border: "1px solid #DADCE0", borderRadius: 20, padding: "4px 12px 4px 5px" }}>
              <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#7A6AD6", color: "#fff", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>A</span>
              <span style={{ fontSize: 13, color: "#3C4043" }}>alex@gmail.com</span>
            </div>
          </div>
          <div style={{ padding: "18px 32px 4px" }}>
            <p style={{ fontSize: 13, color: "#5F6368", margin: "0 0 6px" }}>This will allow Cadence to:</p>
            {[
              { icon: <CalendarIcon size={20} stroke="#5F6368" />, t: "See, edit and manage your calendars", s: "Google Calendar", border: true },
              { icon: <CheckList size={20} stroke="#5F6368" />, t: "Create and manage your tasks", s: "Google Tasks", border: true },
              { icon: <Mail size={20} stroke="#5F6368" />, t: "Read your Primary inbox", s: "Gmail · to surface emails that need a reply", border: false },
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 13, padding: "11px 0", borderBottom: r.border ? "1px solid #ECECEC" : "none" }}>
                <span style={{ flex: "none", marginTop: 1 }}>{r.icon}</span>
                <div>
                  <div style={{ fontSize: 13.5, color: "#3C4043" }}>{r.t}</div>
                  <div style={{ fontSize: 12, color: "#80868B", marginTop: 1 }}>{r.s}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: "14px 32px 24px" }}>
            <p style={{ fontSize: 11.5, lineHeight: 1.5, color: "#80868B", margin: "0 0 18px" }}>
              Make sure you trust Cadence. You can remove access anytime in your Google Account.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Hoverable as="button" onClick={() => setStep("welcome")} style={{ background: "none", border: "none", color: "#1A73E8", fontSize: 14, fontWeight: 600, padding: "8px 14px", borderRadius: 8, cursor: "pointer" }} hover={{ background: "#F1F6FE" }}>
                Cancel
              </Hoverable>
              <Hoverable as="button" onClick={allow} style={{ background: "#1A73E8", border: "none", color: "#fff", fontSize: 14, fontWeight: 600, padding: "9px 22px", borderRadius: 8, cursor: "pointer" }} hover={{ background: "#1764CC" }}>
                Allow
              </Hoverable>
            </div>
          </div>
        </div>
      )}

      {step === "connecting" && (
        <div style={{ ...cardDark, padding: "56px 40px", textAlign: "center", animation: "stepIn .3s ease" }}>
          <div style={{ width: 46, height: 46, margin: "0 auto", borderRadius: "50%", border: "3px solid rgba(255,255,255,0.12)", borderTopColor: accent, animation: "spin .8s linear infinite" }} />
          <h2 style={{ fontSize: 19, fontWeight: 600, color: "#F4F5F7", margin: "26px 0 0" }}>Setting things up…</h2>
          <p style={{ fontSize: 14, color: "#9CA0AA", margin: "8px 0 0" }}>{isTauri ? "Finish signing in with Google in your browser." : "Connecting your calendar, tasks and inbox."}</p>
          <Dots idx={idx} />
        </div>
      )}

      {step === "done" && (
        <div style={{ ...cardDark, padding: "44px 40px 32px", textAlign: "center", animation: "stepIn .3s ease" }}>
          <div style={{ width: 56, height: 56, margin: "0 auto", borderRadius: "50%", background: "rgba(87,199,126,0.14)", display: "flex", alignItems: "center", justifyContent: "center", animation: "pop .4s ease" }}>
            <BigCheck />
          </div>
          <h2 style={{ fontSize: 23, fontWeight: 700, letterSpacing: "-0.01em", color: "#F4F5F7", margin: "22px 0 0" }}>You're all set</h2>
          <p style={{ fontSize: 14, color: "#9CA0AA", margin: "8px 0 0" }}>Everything's connected and ready to plan.</p>
          <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 9, textAlign: "left" }}>
            {[
              { icon: <CalendarIcon size={18} stroke="#D9A441" />, t: "Calendar connected", s: "2 calendars · this week synced" },
              { icon: <CheckList size={18} stroke="#57C77E" />, t: "Google Tasks imported", s: "12 open tasks · sorted by due date" },
              { icon: <Mail size={18} stroke="#E0855A" />, t: "Gmail · Primary linked", s: "3 emails need a reply" },
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "#1A1C22", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px" }}>
                {r.icon}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, color: "#E6E7EA", fontWeight: 500 }}>{r.t}</div>
                  <div style={{ fontSize: 11.5, color: "#6C7079" }}>{r.s}</div>
                </div>
                <BigCheck size={17} />
              </div>
            ))}
          </div>
          <Hoverable
            as="button"
            onClick={() => onEnter(email)}
            style={{ marginTop: 26, width: "100%", height: 46, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: accent, color: ACCENT_FG, border: "none", borderRadius: 11, fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}
            hover={{ filter: "brightness(0.94)" }}
          >
            Open Cadence
            <ArrowRight />
          </Hoverable>
          <Dots idx={idx} />
        </div>
      )}
    </div>
  );
}
