# Cadence — Idea Log

Running log of feature ideas gathered from web-research sub-agents (each idea cites a
real user problem), with the disposition of each: **Built**, **Planned**, **Deferred**,
or **Rejected** (with reason). Convergence across independent agents is noted.

Disposition key: ✅ Built · 🔨 Building this round · 📋 Planned next · ⏸ Deferred · ❌ Rejected

---

## Round 1 (5 agents: competitors, GCal/Tasks/Gmail pain, time-blocking, scheduling, keyboard power-users)

| # | Idea | User problem (cited) | Source | Disposition |
|---|------|----------------------|--------|-------------|
| 1 | **Day capacity / overcommit warning** — sum meetings + task blocks vs free hours; warn when a day is overbooked | "overestimate how much they can accomplish… leading to incomplete to-do lists and feelings of failure"; can't see how much is committed on a given day | makeheadway.com/blog/cal-newport-time-blocking; groups.google.com/g/gqueues | 🔨 this round |
| 2 | **Conflict / double-booking detector** across calendars | "Calendar doesn't alert double-booking event conflict" | support.google.com/calendar/thread/702910 | 🔨 this round |
| 3 | **Join next meeting** global hotkey → opens conference link | Vimcal "Join your meeting with one click. Just press 'V'"; Raycast "three keystrokes and you're in the call" | linkedin.com/posts/vimcal…; manual.raycast.com/calendar | 🔨 this round |
| 4 | **Keyboard grid nav + jump-to-date** (T=today, ←/→ week, G/. = jump) + `?` cheatsheet | Cron: "press T to get to today… period hotkey to instantly jump to any date" | cron.com/changelog/2021-03-29-shortcuts | 🔨 this round |
| 5 | **Auto-buffer between back-to-back meetings** + zero-gap warning | "Back-to-back meetings leave little to no time for preparation, breaks, or transitions" (cited by 4/5 agents) | reclaim.ai/features/buffer-time; xfanatical.com | 🔨 this round |
| 6 | **Hide declined events; treat as free** for scheduling/availability | "declined events still clutter calendar… option not to show declined" | support.google.com/calendar/thread/244166792 | 🔨 this round |
| 7 | **Task due-times + native macOS notifications** (Google Tasks has none) | "Google Tasks has no way to schedule a specific due time… no push notification at a specific time" | issuetracker.google.com/issues/36759725; tasksboard.com/blog | 📋 next |
| 8 | **Overdue auto-rollover** to today + morning review | users script cron jobs to "move past-due tasks to current day automatically" | github.com/jfr3000/google-tasks-rollover | 📋 next |
| 9 | **Pre-meeting brief / context card** (attendees + recent Gmail thread + agenda) | "spend 10–15 min before every call searching across Slack, email, Drive" | granola.ai pre-meeting-briefs; atrium.me | 📋 next (uses Gmail) |
| 10 | **Protected/flexible focus blocks** that warn/decline conflicting invites | "63.9% report defending focus time as biggest calendar challenge" | reclaim.ai/blog/what-is-focus-time; getclockwise.com | 📋 next |
| 11 | **Planned-vs-actual + end-of-day shutdown/rollover** | Sunsama: "shutdown ritual… most improves work-life balance"; "planned vs actual is huge to me" | sunsama.com/features/daily-planning-and-shutdown | 📋 next |
| 12 | **"What should I do now?"** focus suggestion (current block or best-fit task) | ADHD/overwhelm "decision paralysis… not knowing what to do next" | super-productivity.com/blog/adhd-time-blindness | 📋 next |
| 13 | **Cascade replan / spillover reschedule** (re-flow remaining blocks when one overruns) | "When one block collapses… your entire schedule is thrown off. Calendars are static" | flowsavvy.app/why-most-time-blocking-systems-fail | ⏸ defer (bigger) |
| 14 | **Time-zone dual gutter / time-travel + DST-safe availability** | "forgetting to update time zone when traveling… events in wrong time zone"; DST missed-meeting stories | support.google.com/calendar/answer/37064; techbloat.com | ⏸ defer (medium) |
| 15 | **Multi-level undo with named toast** ("Undid: moved Standup → 3pm") | fast keyboard apps need reversible safety; Cadence undo is single-step/silent | blog.superhuman.com/command-palette | 📋 next (enables risky actions) |
| 16 | **Fuzzy search across events + tasks** in ⌘K | "command palettes do double duty as universal search… find a specific meeting/task instantly" | maggieappleton.com/command-bar | 📋 next |
| 17 | **Quick reschedule by keyboard** (R/M → NL "+30m", "thursday 2pm") | Vimcal "reschedule faster than any other calendar app" | efficient.app/apps/vimcal | 📋 next |
| 18 | **Snooze / remind (H)** — hide task until a chosen time | Superhuman snooze "hides them completely until you're ready" | help.superhuman.com/Remind-Me | 📋 next |
| 19 | **NL far-future create** from ⌘N (create event on any date w/o navigating) | Cron: scheduling months out is "a pain… ten minutes to schedule an appointment" | medium.com/@iampariah | ⏸ defer (needs day/month views) |
| 20 | **Reuse / nicknamed availability sets** | Vimcal "Reuse Slots… Nicknames to keep tabs on who a slot was for" | vimcal.com | 📋 next (small) |
| 21 | **Propose-3-times message generator** (paste-ready, recipient TZ) | "Sharing booking links is awkward; typing availabilities is tedious" | vimcal.com; efficient.app | ⏸ defer (pairs w/ #14) |
| 22 | **Auto-expiring tentative holds** for proposed slots | "remove reserved times not confirmed within X"; avoid double-book while waiting | community.calendly.com | ⏸ defer (medium) |
| 23 | **Meeting-free zones** (recurring no-meeting windows) | "designate meeting-free zones… or meetings consume every open slot" | altisrecruitment.com | ⏸ defer |
| 24 | **Sent-email follow-up tracking** ("waiting on a reply") | "send an email then track manually… most forget to follow up" | alore.io/blog/follow-up-reminder-gmail | ⏸ defer (Gmail) |
| 25 | **Recurring tasks** Cadence-managed (Google's are flaky) | "repeating tasks only show on first day… not showing until due date" | support.google.com/calendar/thread/392363542 | ⏸ defer (large) |
| 26 | **Ambient countdown + non-blocking checkpoint nudges** | "a timer that beeps once is easy to dismiss during hyperfocus" | super-productivity.com/blog | ⏸ defer (pairs w/ #7) |
| 27 | **Group free/busy poll** (intersect calendars) | "77 clicks to propose times… endless back-and-forth" | vimcal.com/the-assist | ❌ reject for now (needs others' calendars/org scope) |
| 28 | **Bulk ops in triage** (multi-select complete/reschedule) | Superhuman "process hundreds with minimal friction" | help.superhuman.com/Speed-Up | ⏸ defer (gated on #15) |

---

### This round — building #1, #2, #3, #4, #5, #6
Chosen because they're high-frequency complaints, distinctive vs. stock Google, and build
directly on data/flows Cadence already owns (no new scopes or heavy infra).
