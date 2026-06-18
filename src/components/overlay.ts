import type { CSSProperties } from "react";

/** Shared dimmed backdrop for the ⌘N / ⌘K modals. */
export function overlay(paddingTop: string): CSSProperties {
  return {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    zIndex: 9500,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop,
    animation: "fadein .12s ease-out",
  };
}
