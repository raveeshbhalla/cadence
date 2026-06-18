import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** Catches render errors so a single bad component doesn't blank the app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Cadence crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0E0F13", color: "#ECEDF0", fontFamily: "Inter, system-ui, sans-serif", padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#FF7A45", marginBottom: 10 }}>Cadence hit a snag</div>
            <div style={{ fontSize: 13, color: "#9CA0AA", lineHeight: 1.6, marginBottom: 20 }}>{this.state.error.message}</div>
            <button
              onClick={() => this.setState({ error: null })}
              style={{ background: "#FF7A45", color: "#1A0E07", border: "none", borderRadius: 9, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Reload view
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
