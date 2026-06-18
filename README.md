# Cadence

A native, cross-platform **calendar + tasks** desktop app — calendar (à la Cron) and task
manager (à la Todoist) collapsed into one surface so the morning planning ritual happens in a
single place. Built with **React + Tauri**, targeting macOS first.

The UX is a faithful build of the
[Cadence Claude Design project](https://claude.ai/design/p/94733f8c-294a-4228-aef5-c1686ba37411).
**Live integrations** (when signed in): real Google **Calendar** (meetings),
Google **Tasks** (read + write-back), **Gmail** Primary (unreplied → email tasks),
and **OpenAI**-backed capture parsing. Without sign-in it runs on in-memory seed
data. See `docs/SETUP.md` for credentials + OAuth client setup.

## The daily loop

1. **Triage** — see everything that needs doing today (overdue, today, unreplied Primary email, meetings) on one surface.
2. **Block** — drag a task onto the calendar to turn it into a linked time block.
3. **Adjust** — move/resize blocks around real meetings until the day fits.
4. **Clear** — complete work as it's done; finished items archive out of the active list.

## Stack & architecture

| Layer | Choice | Why |
| --- | --- | --- |
| Shell | **Tauri v2** (Rust) | Native macOS window, tiny binary, low memory vs Electron |
| UI | **React 18 + TypeScript + Vite** | Fast HMR, typed components |
| State | **Zustand** | Minimal re-renders, no context churn |
| Fonts | **@fontsource/inter** (bundled) | Offline, no CDN round-trip |

### Performance design (low-lag dragging)

Dragging is the hot path. To keep it at 60 fps:

- The **live cursor position** lives in an isolated store (`store/pointer.ts`). Only the floating
  drag chip subscribes, so cursor-follow never re-renders the app tree. The chip is positioned
  with a GPU-composited `transform` + `will-change`.
- The **snapped drop target** updates the main store _only when it actually changes_ (i.e. when the
  pointer crosses a 15-minute / day boundary), not on every `pointermove`. See
  `store/usePointerHandlers.ts`.
- Event layout (`pack()` overlap columns) is memoised on `[events, hidden, density]` so the
  ghost/mask overlays can change during a drag without recomputing block geometry.

### Layout

```
Titlebar  (custom traffic lights, sidebar toggle, ⌘K)
├─ Sidebar      mini-month · Calendars · Sources · Lists · New task
├─ Calendar     Mon–Fri, 7 AM–10 PM, now-line, drag-to-schedule, ghost + PAST mask
└─ Tasks rail   Overdue · Today · Inbox · Tomorrow · This week · Next week · Later · Email · Completed
```

### Source map

```
src/
  theme.ts                design tokens (colors, category palettes, grid geometry)
  types.ts                domain + interaction types
  data/seed.ts            seed events + tasks (fixed demo week, Jun 15–19 2026)
  lib/
    format.ts             time/duration formatting, bucketing, grid coordinate math
    parse.ts              natural-language capture parser (⌘N)
    pack.ts               overlap-packing for side-by-side blocks
  store/
    app.ts                main Zustand store + all actions
    pointer.ts            isolated high-frequency pointer store
    usePointerHandlers.ts document-level pointer/keyboard gesture engine
    selectors.ts          tasks → rail sections / archive
  components/             Onboarding, Titlebar, Sidebar, Calendar, TaskRail,
                          Capture (⌘N), CommandPalette (⌘K), Toast, DragChip
src-tauri/                Rust shell (frameless window, custom titlebar)
```

## Interactions

| Key | Action |
| --- | --- |
| `⌘N` | Capture a new task (natural language → chips) |
| `⌘K` | Command palette |
| `⌘Z` | Undo the last add / move / resize (single-level) |
| `Enter` | Confirm capture · run top command |
| `Esc` | Close any dialog |

- **Drag** a task row onto the grid → creates a time block of the task's estimated duration, linked back to the task (tagged `blocked ✓`).
- **Move / resize** blocks; everything snaps to 15 minutes (15-min minimum).
- **Drag-select** an empty stretch → opens capture pre-filled with that range.
- **Guardrails:** nothing can be scheduled or moved into the past (greyed-out `PAST` mask + red ghost).
- Capture parsing is framed as `gpt-5.4-nano`; it's a local regex parser in the mock.

## Develop

```bash
pnpm install
pnpm dev          # Vite dev server only (browser preview at :1420)
pnpm app          # tauri dev — native window (requires Rust toolchain)
pnpm app:build    # tauri build — production .app / .dmg

pnpm test         # Vitest unit suite (dates / parse / bucketing / packing / rail)
pnpm typecheck    # tsc --noEmit
pnpm format       # Prettier
cargo test --manifest-path src-tauri/Cargo.toml --lib   # Rust unit tests
```

CI (`.github/workflows/ci.yml`) runs the frontend typecheck/tests/build and the
Rust tests/check on every push and PR.

The app runs in a browser too (drag, ⌘K, ⌘N all work); the traffic-light buttons are inert
outside Tauri.

## Out of scope (v1)

Live account sync, multi-week navigation, real Day/Month views, mobile, collaboration,
recurring tasks, multi-level undo, auto-planning. Week navigation (`‹ Today ›`) and the
Day/Month switches acknowledge with a toast rather than re-paginating.
