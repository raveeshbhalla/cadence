import { forwardRef, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode } from "react";

interface HoverableProps {
  as?: "div" | "button" | "a" | "span";
  style: CSSProperties;
  hover: CSSProperties;
  className?: string;
  title?: string;
  href?: string;
  onClick?: (e: any) => void;
  onPointerDown?: (e: PointerEvent) => void;
  onMouseEnter?: (e: MouseEvent) => void;
  children?: ReactNode;
  dragRegion?: boolean;
  [key: `data-${string}`]: string | boolean | undefined;
}

/** Lightweight inline-style hover wrapper — keeps fidelity with the design's style-hover. */
export const Hoverable = forwardRef<HTMLElement, HoverableProps>(function Hoverable(
  { as = "div", style, hover, className, title, href, onClick, onPointerDown, onMouseEnter, children, dragRegion, ...rest },
  ref,
) {
  const [h, setH] = useState(false);
  const Tag = as as any;
  return (
    <Tag
      ref={ref}
      className={className}
      title={title}
      href={href}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onMouseEnter={(e: MouseEvent) => {
        setH(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={() => setH(false)}
      style={h ? { ...style, ...hover } : style}
      {...rest}
      {...(dragRegion ? { "data-tauri-drag-region": true } : {})}
    >
      {children}
    </Tag>
  );
});
