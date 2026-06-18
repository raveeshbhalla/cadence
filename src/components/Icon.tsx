import type { CSSProperties, ReactNode } from "react";

interface SvgProps {
  size?: number;
  stroke?: string;
  fill?: string;
  sw?: number;
  style?: CSSProperties;
  children: ReactNode;
}

function Svg({ size = 16, stroke, fill = "none", sw = 2, style, children }: SvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} style={style}>
      {children}
    </svg>
  );
}

export const Sparkle = ({ size = 15, fill }: { size?: number; fill: string }) => (
  <Svg size={size} fill={fill}>
    <path d="M12 2l1.7 5.1L19 9l-5.3 1.9L12 16l-1.7-5.1L5 9l5.3-1.9z" />
  </Svg>
);

export const SidebarIcon = ({ size = 17 }: { size?: number }) => (
  <Svg size={size} stroke="currentColor">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
  </Svg>
);

export const Search = ({ size = 13, stroke = "#9CA0AA" }: { size?: number; stroke?: string }) => (
  <Svg size={size} stroke={stroke}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </Svg>
);

export const ChevronLeft = ({ size = 15 }: { size?: number }) => (
  <Svg size={size} stroke="currentColor">
    <path d="m15 18-6-6 6-6" />
  </Svg>
);
export const ChevronRight = ({ size = 15 }: { size?: number }) => (
  <Svg size={size} stroke="currentColor">
    <path d="m9 18 6-6-6-6" />
  </Svg>
);

export const Plus = ({ size = 14 }: { size?: number }) => (
  <Svg size={size} stroke="currentColor">
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const Mail = ({ size = 14, stroke = "#E0855A" }: { size?: number; stroke?: string }) => (
  <Svg size={size} stroke={stroke}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m2 7 10 6 10-6" />
  </Svg>
);

export const CheckList = ({ size = 14, stroke = "#57C77E" }: { size?: number; stroke?: string }) => (
  <Svg size={size} stroke={stroke}>
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </Svg>
);

export const Check = ({ size = 11, stroke = "#0E0F13", sw = 3.5 }: { size?: number; stroke?: string; sw?: number }) => (
  <Svg size={size} stroke={stroke} sw={sw}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);

export const CalendarIcon = ({ size = 18, stroke = "#D9A441" }: { size?: number; stroke?: string }) => (
  <Svg size={size} stroke={stroke} sw={1.9}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </Svg>
);

export const ArrowRight = ({ size = 16, stroke = "#1A0E07" }: { size?: number; stroke?: string }) => (
  <Svg size={size} stroke={stroke} sw={2.4}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

export const GoogleG = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

export const BigCheck = ({ size = 28, stroke = "#57C77E" }: { size?: number; stroke?: string }) => (
  <Svg size={size} stroke={stroke} sw={2.4}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);
