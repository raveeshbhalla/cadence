// Design tokens extracted verbatim from the Cadence Claude Design files.
// Single source of truth for colors, category palettes, and grid geometry.

export type CategoryKey =
  | "work"
  | "design"
  | "eng"
  | "sales"
  | "personal"
  | "email";

export interface CategoryPalette {
  dot: string;
  fill: string;
  bar: string;
  text: string;
}

export const CATS: Record<CategoryKey, CategoryPalette> = {
  work: { dot: "#D9A441", fill: "rgba(217,164,65,0.15)", bar: "#D9A441", text: "#EBD3A0" },
  design: { dot: "#9C8CFF", fill: "rgba(156,140,255,0.15)", bar: "#9C8CFF", text: "#D3CAFF" },
  eng: { dot: "#5B9BFF", fill: "rgba(91,155,255,0.15)", bar: "#5B9BFF", text: "#C6DBFF" },
  sales: { dot: "#3FB6A4", fill: "rgba(63,182,164,0.15)", bar: "#3FB6A4", text: "#BDEBE2" },
  personal: { dot: "#E87BA0", fill: "rgba(232,123,160,0.15)", bar: "#E87BA0", text: "#F6CFDC" },
  email: { dot: "#E0855A", fill: "rgba(224,133,90,0.15)", bar: "#E0855A", text: "#F2C9B2" },
};

export const ACCENT_OPTIONS = ["#FF7A45", "#5B9BFF", "#9C8CFF", "#3FB6A4"] as const;
export const DEFAULT_ACCENT = "#FF7A45";
/** Foreground used on top of the accent fill (dark espresso). */
export const ACCENT_FG = "#1A0E07";

// Neutral palette (dark theme)
export const C = {
  appBg: "#07080A",
  windowBg: "#0E0F13",
  calendarBg: "#0B0C10",
  sidebarBg: "#101218",
  titlebarBg: "#16181E",
  modalBg: "#181A20",
  modalFooterBg: "#13151A",
  rowHover: "#1A1D24",
  chipBg: "#202329",

  border: "rgba(255,255,255,0.06)",
  borderSoft: "rgba(255,255,255,0.05)",
  borderStrong: "rgba(255,255,255,0.09)",
  hairline: "rgba(255,255,255,0.045)",

  text: "#F2F3F5",
  textHi: "#ECEDF0",
  text2: "#E6E7EA",
  text3: "#D6D8DD",
  text4: "#C9CCD2",
  text5: "#B6B9C0",
  textMute: "#9CA0AA",
  textMute2: "#8A8E98",
  textMute3: "#7E828C",
  textFaint: "#6C7079",
  textFaint2: "#5A5D66",
  textFaint3: "#4A4E58",

  completed: "#57C77E",
  overdue: "#E5736B",
  scheduled: "#9C8CFF",
} as const;

// ── Grid geometry ────────────────────────────────────────────────
export const START_HOUR = 7; // 7 AM
export const END_HOUR = 22; // 10 PM
export const SNAP_MIN = 15;
export const MIN_BLOCK_MIN = 15;
export const PX_PER_HOUR_COZY = 56;
export const PX_PER_HOUR_COMPACT = 44;

export type Density = "cozy" | "compact";
export const pxPerHour = (d: Density) => (d === "compact" ? PX_PER_HOUR_COMPACT : PX_PER_HOUR_COZY);

// ── Fixed demo week (Mon Jun 15 – Fri Jun 19, 2026) ──────────────
export const TODAY_INDEX = 2; // Wednesday
export const WEEK_INDEX = 2;
export const NOW_MIN = 9 * 60 + 10; // 9:10 AM

export const DAYS = [
  { wd: "Mon", dom: 15 },
  { wd: "Tue", dom: 16 },
  { wd: "Wed", dom: 17 },
  { wd: "Thu", dom: 18 },
  { wd: "Fri", dom: 19 },
] as const;

export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
