# Cadence

### Plan your day in one calm place.

Cadence is a native macOS app that collapses your **calendar, tasks, and email**
into a single surface — so the morning planning ritual happens in one place, runs
on the keyboard, and finishes in minutes. It's powered entirely by **your own
Google account**: nothing lives on our servers, and you can walk away with your
data anytime.

It's Cron's speed, Todoist's task model, and Sunsama's daily-planning calm —
without five tabs and three subscriptions.

---

## The problem

Your day is scattered across three apps that don't talk to each other. Google
Calendar holds the meetings, Google Tasks holds the to-dos (with no time, no
notifications, no time-blocking), and Gmail holds the things you actually need to
reply to. Planning means tab-juggling, copy-pasting, and hoping nothing slips.

Cadence puts all three on one grid and makes the plan **honest**: what you have to
do, the time you actually have, and what to do next.

---

## Why Cadence

**🗓️ One surface, really unified.** Your Google meetings, your Google Tasks, and
your unreplied Primary email all land on one Mon–Fri (or full-week, or single-day)
grid. Drag a task onto the calendar and it becomes a real, linked time block in
Google Calendar. Complete it anywhere — grid, rail, menu bar — and it syncs.

**⌨️ Capture at the speed of thought.** Hit **⌘N** and type
`Spin class 7:45am–9am tomorrow` — Cadence parses the date, time range, duration,
and list instantly, and an LLM refines it on the way in (in *your* language:
"übermorgen", "lunes que viene"). `[ ]` makes it a task; otherwise it's a calendar
event. **⌘K** runs anything.

**⚡ Triage, don't fiddle.** A keyboard-only **Triage** mode walks you through your
overdue and today tasks one at a time, proposing open slots computed around what's
already on your calendar. `1`, `2`, `3` to pick, `↵` for the first, done.

**🧠 Guardrails that keep the plan real.** Cadence warns when a day is overbooked
("Over by 2h"), flags double-bookings, hides events you declined, adds transition
buffers between meetings, and always answers *"what should I do right now?"*

**🤝 Built for the meeting day.** **⌘J** joins your next call (Zoom, Meet, or
Teams — it finds the link wherever it's hiding). The **menu bar** shows your next
event with a live countdown. **Present mode** redacts every title before you
screen-share, so "Therapist appointment" doesn't end up on the projector.

**🔒 Trust by design.** Your data lives in your Google account — Cadence reads and
writes it, never hoards it. One-click **export** to JSON + CSV, a visible
"synced 2m ago" indicator, secure token storage in the macOS Keychain, native and
private. It honors *Reduce Motion*, plays nicely with VoiceOver-friendly fallbacks,
and spells out durations so you never have to do calendar arithmetic.

---

## Highlight reel

> **"Spin class 7:45am–9am tomorrow #fitness"** → a 1h 15m event tomorrow morning,
> on the right calendar, in two seconds.

> Drag *"Draft Q3 deck"* from your inbox of tasks onto Thursday at 2pm → a linked
> block appears, its due date moves to Thursday, and it's written back to Google
> Calendar and Google Tasks.

> An email you haven't replied to becomes a task; schedule it and it's promoted to
> a real Google Task; complete it and the thread is **archived out of your inbox**.

> It's 4:50pm and your menu bar reads **"Retro · in 10m"**. Press **⌘J**. You're in.

---

## The complete feature list

### Plan & triage
- Unified week / day / 7-day grid of meetings + scheduled tasks
- Drag any task onto the grid to time-block it (linked back to Google Tasks + Calendar)
- Move / resize / unschedule blocks; everything snaps to 15 minutes
- Keyboard **Triage mode** — slot overdue + today's tasks into open gaps
- **"What should I do now?"** focus bar — current activity, next up, or the best task to start
- **Day-capacity warning** — work-to-do vs. free time left ("Over by 2h")
- **Roll overdue → today** in one action
- Scheduling a task sets its due date (overdue tasks stop nagging once planned)

### Capture
- **⌘N natural-language capture** — dates, time ranges, durations, `#lists`
- LLM-refined parsing (gpt-4o-mini), **locale-aware** for non-English phrases
- `[ ]` marks a task; drag-select on the grid creates an event by default
- Drag-select an empty stretch to capture a block in that range

### Calendar correctness
- Real Google **Calendar sync** across all your calendars (colored, toggleable)
- **All-day events** in a banner lane (birthdays, PTO, multi-day)
- **Recurring events** render every occurrence
- **Hide declined** invites (and treat them as free time)
- **Double-booking / overlap detector**
- **Timezone-discrepancy badge** ("created in America/New_York")
- Live "now" line, fixed nothing-lags rendering, untitled-event fallbacks

### The meeting day
- **⌘J — join your next meeting** (Zoom / Meet / Teams link auto-detected)
- **Menu-bar next event** with a relative countdown ("· in 22m", "· now")
- **Meeting details** — location, description (clickable links), **Join** button
- **Transition buffers** after meetings, one click
- **Present / privacy mode** — redact all titles for screen-sharing
- **Share availability** — drag to collect open slots, copy as bullets to clipboard
- **Native reminders** a few minutes before meetings & blocks

### Tasks & email
- Two-way **Google Tasks** sync (complete, create, rename, delete, due dates)
- **Gmail Primary** "needs reply" surfaced as tasks
- **Email ↔ task dedup** — one item, not two, when a task was made from an email
- Drag an email onto the grid → it becomes a real scheduled task
- **Complete an email task → the thread is archived** out of your inbox
- Rail buckets: Overdue · Today · Email · Inbox · Tomorrow · This week · Next week · Later · Completed

### Speed & navigation
- **⌘K command palette** · **⌘F search** across events + tasks · **⌘Z undo**
- Single-key nav: `T` (today), `[` `]` (weeks), `G` (go to date), `?` (shortcuts)
- **Go to date** — "friday", "Jul 1", "12/25", "2026-08-15"
- Click a meeting for details; click a task block to rename / unschedule / delete

### Trust, inclusion & polish
- **Your data stays in your Google account** — Cadence never stores it on a server
- **One-click export** (JSON + CSV) — leave anytime
- **Sync status** ("synced 2m ago") + manual refresh
- Tokens in the macOS **Keychain**; OAuth via PKCE
- **Settings**: accent color, density, weekends, completion sound, Gmail toggle
- Honors **Reduce Motion**; spelled-out durations (no time math); accessible fallbacks
- Menu-bar app: closes to the tray, "Join next meeting" from the menu
- Settings & view preferences persist across launches

### Under the hood
- **React + TypeScript + Vite + Zustand**, wrapped in a frameless **Tauri v2 (Rust)** window
- Low-lag dragging (isolated pointer store, GPU transforms, boundary-only re-renders)
- 28 unit tests + Rust tests, GitHub Actions CI
- ~200 KB JS bundle; native binary, tiny memory footprint vs. Electron

---

*Cadence — your calendar and tasks, in one calm place. Runs on your Mac, on your
Google account, on your keyboard.*
