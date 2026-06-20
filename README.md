# Cadence

Cadence is a native **calendar + tasks** desktop app: meetings, Google Tasks,
and email follow-ups in one planning surface. It is built with **React + Tauri**
and currently targets macOS first.

Status: early public alpha. The app runs locally on your Mac and talks directly
to your Google account and OpenAI API key. There is no hosted Cadence backend.

Live integrations, when signed in:

- Google **Calendar** for meetings and all-day events
- Google **Tasks** for task read/write and scheduled task blocks
- **Gmail** Primary for unreplied-message triage
- **OpenAI** for capture parsing

Native signed-in loads show skeletons until live Google data arrives. The
browser-only preview uses in-memory demo data.

## Install a Release

Every pushed version tag builds a macOS DMG in GitHub Actions and uploads it to
the matching GitHub Release. Download the latest `.dmg` from the Releases page,
open it, and drag `Cadence.app` into `/Applications`.

Current release builds are not Apple-notarized. After installing the app, macOS
may block it with a security warning. If you trust the downloaded build, remove
the quarantine attribute from this app only:

```sh
xattr -dr com.apple.quarantine /Applications/Cadence.app
```

Then open Cadence from `/Applications`.

To use live sync, configure your own Google OAuth credentials and OpenAI API key.
See [docs/SETUP.md](docs/SETUP.md).

## The daily loop

1. **Triage** — see everything that needs doing today (overdue, today, unreplied Primary email, meetings) on one surface.
2. **Block** — drag a task onto the grid to schedule it without creating a calendar event.
3. **Adjust** — move/resize blocks around real meetings until the day fits.
4. **Clear** — complete work as it's done; finished items archive out of the active list.

## Current capabilities

- **Live Google Calendar**: reads meetings and all-day events across calendars, preserves
  calendar colors, shows conflicts, and lets you RSVP `Yes`, `Maybe`, or `No` from event details.
- **Live Google Tasks**: reads task lists, writes new tasks, syncs task completion and due dates,
  and stores scheduled task times on the task itself.
- **Event capture**: quick capture defaults to a task, but can be toggled to a calendar event
  with required date, time, and duration; guests are optional.
- **Gmail triage**: unreplied Primary messages appear as lightweight email tasks.
- **Loading state**: native signed-in startup renders app-shaped skeletons rather than showing
  demo data while Google Calendar/Tasks/Gmail hydrate.

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
- Event layout (`pack()` collision columns) is memoised on `[events, hidden, density]` so the
  ghost/mask overlays can change during a drag without recomputing block geometry.

### Layout

```
Titlebar  (custom traffic lights, sidebar toggle, ⌘K)
├─ Sidebar      mini-month · Calendars · Sources · Lists · New task
├─ Calendar     Mon–Sun, 24-hour day, now-line, drag-to-schedule, ghost + PAST mask
└─ Tasks rail   Overdue · Today · Inbox · Tomorrow · This week · Next week · Later · Email · Completed
```

### Source map

```
src/
  theme.ts                design tokens (colors, category palettes, grid geometry)
  types.ts                domain + interaction types
  data/seed.ts            seed events + tasks (fixed demo week, Jun 15–21 2026)
  lib/
    format.ts             time/duration formatting, bucketing, grid coordinate math
    parse.ts              natural-language capture parser (⌘N)
    pack.ts               collision packing for side-by-side blocks
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
| `Tab` | Toggle capture between Task and Event while the title field is focused |
| `Esc` | Close any dialog |

- **Drag** a task row onto the grid → schedules that task for its estimated duration (tagged `blocked ✓`) without creating a Calendar event.
- **Move / resize** blocks; everything snaps to 15 minutes (15-min minimum).
- **Drag-select** an empty stretch → opens capture pre-filled with that range, defaulting to a task.
- **Event mode** in capture requires date/time before it writes a Calendar event; guests are optional.
- **Event details** include RSVP controls for invites where Google exposes the signed-in user as an attendee.
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

Pushing a version tag such as `v0.1.1` runs `.github/workflows/release.yml`,
sets the app version from the tag, builds a macOS DMG, creates the GitHub
Release if needed, and uploads the DMG. See [docs/RELEASE.md](docs/RELEASE.md).

The app runs in a browser too (drag, ⌘K, ⌘N all work); the traffic-light buttons are inert
outside Tauri.

## Out of scope (v1)

Month view, mobile, collaboration, recurring tasks, recurring edit scope, multi-level undo,
auto-planning, offline queues, and multiple Google accounts.
