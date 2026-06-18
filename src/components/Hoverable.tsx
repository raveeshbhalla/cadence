import { useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";

interface HoverableProps {
  as?: "div" | "button" | "a" | "span";
  style: CSSProperties;
  hover: CSSProperties;
  className?: string;
  title?: string;
  href?: string;
  onClick?: (e: any) => void;
  onPointerDown?: (e: PointerEvent) => void;
  children?: ReactNode;
  dragRegion?: boolean;
}

/** Lightweight inline-style hover wrapper — keeps fidelity with the design's style-hover. */
export function Hoverable({ as = "div", style, hover, className, title, href, onClick, onPointerDown, children, dragRegion }: HoverableProps) {
  const [h, setH] = useState(false);
  const Tag = as as any;
  return (
    <Tag
      className={className}
      title={title}
      href={href}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={h ? { ...style, ...hover } : style}
      {...(dragRegion ? { "data-tauri-drag-region": true } : {})}
    >
      {children}
    </Tag>
  );
}
