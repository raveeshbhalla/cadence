# Cadence — Idea Log

Running log of feature ideas gathered from web-research sub-agents (each idea cites a
real user problem), with the disposition of each: **Built**, **Planned**, **Deferred**,
or **Rejected** (with reason). Convergence across independent agents is noted.

Disposition key: ✅ Built · 🔨 Building this round · 📋 Planned next · ⏸ Deferred · ❌ Rejected

---

## Round 1 (5 agents: competitors, GCal/Tasks/Gmail pain, time-blocking, scheduling, keyboard power-users)

| # | Idea | User problem (cited) | Source | Disposition |
|---|------|----------------------|--------|-------------|
| 1 | **Day capacity / overcommit warning** — sum meetings + task blocks vs free hours; warn when a day is overbooked | "overestimate how much they can accomplish… leading to incomplete to-do lists and feelings of failure"; can't see how much is committed on a given day | makeheadway.com/blog/cal-newport-time-blocking; groups.google.com/g/gqueues | ✅ Built |
| 2 | **Conflict / double-booking detector** across calendars | "Calendar doesn't alert double-booking event conflict" | support.google.com/calendar/thread/702910 | ✅ Built |
| 3 | **Join next meeting** global hotkey → opens conference link | Vimcal "Join your meeting with one click. Just press 'V'"; Raycast "three keystrokes and you're in the call" | linkedin.com/posts/vimcal…; manual.raycast.com/calendar | ✅ Built |
| 4 | **Keyboard grid nav + jump-to-date** (T=today, ←/→ week, G/. = jump) + `?` cheatsheet | Cron: "press T to get to today… period hotkey to instantly jump to any date" | cron.com/changelog/2021-03-29-shortcuts | ✅ Built |
| 5 | **Auto-buffer between back-to-back meetings** + zero-gap warning | "Back-to-back meetings leave little to no time for preparation, breaks, or transitions" (cited by 4/5 agents) | reclaim.ai/features/buffer-time; xfanatical.com | ✅ Built |
| 6 | **Hide declined events; treat as free** for scheduling/availability | "declined events still clutter calendar… option not to show declined" | support.google.com/calendar/thread/244166792 | ✅ Built |
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

---

## Round 2 (4 agents: churn/trust, integrations, red-team gaps, niche power-users)

New ideas only (the agents were given Round 1 as an avoid-list). High convergence on
**correctness gaps** (all-day events, recurring, day/weekend views) and **trust** (export, sync ledger).

| # | Idea | User problem (cited) | Source | Disposition |
|---|------|----------------------|--------|-------------|
| 29 | **All-day events** rendered in a banner lane (currently dropped!) | "Display All Day / Multiple Day events on my timeline"; birthdays/PTO/deadlines vanish | support.google.com/calendar/thread/902104 | 🔨 this round (bug) |
| 30 | **Day / weekend view toggle** (1 / 5 / 7-day) | "unable to remove weekends"; "Show Weekends not respected"; need single-Day focus | support.google.com/calendar/thread/182313116 | 🔨 this round |
| 31 | **Event search** (⌘F across past/future events + tasks) | "hit / to instantly look up past meetings"; "how can I see past events" | x.com/googlecalendar/status/1999120740415672614 | 🔨 this round |
| 32 | **Native meeting reminders / notifications** (fire when in another app) | "pop-up alert 10 min before"; "no notifications for calendar appointments" → missed meetings | docs.meeting-reminders.com; learn.microsoft.com | 🔨 this round |
| 33 | **Data export / "leave anytime"** (JSON/ICS/CSV) — trust | lock-in fear; "why stick with anything"; Akiflow exit pain | macstories.net/notes/llms-for-data-portability | 🔨 this round |
| 34 | **Sync-health + change ledger** ("what Cadence wrote to Google") | "stopped trusting it" after silent sync glitches/stale state | product.akiflow.com/changelog | 📋 next (trust) |
| 35 | **To-do bankruptcy / declutter** (archive stale 30d+ tasks) | "lists become so overgrown users stop opening them" | todoist.com/inspiration/todo-list-bankruptcy | 📋 next |
| 36 | **Recurring edit-scope** (this / following / all) on synced series | "what should be set once ends up managed again and again" | getclockwise.com/blog/recurring-meetings | ⏸ defer (read already works via singleEvents) |
| 37 | **Multiple Google accounts** (work+personal in one view) | "Find a Time can't see a second account… suggests slots that conflict" | syncdate.app/blog | ⏸ defer (large; makes smart features correct) |
| 38 | **Month view** | "am I free the week of the 20th?" needs month granularity | usecarly.com all-day events | ⏸ defer (after all-day) |
| 39 | **Offline mode** (cached week, queued writes) | "view/edit calendar offline"; native app should beat web | support.google.com/calendar/answer/1340696 | ⏸ defer (large) |
| 40 | **macOS Focus mode follows meetings** | "tie focus modes to calendar events… no built-in trigger" | discussions.apple.com/thread/255620382 | ⏸ defer (OS scripting) |
| 41 | **Slack/Teams status sync** (richer than stock) | stock GCal-Slack only sets blunt "In a meeting" | slack.com/help/articles/206329808 | ⏸ defer (needs Slack) |
| 42 | **Canonical Join link** (dedup Zoom links, tel: dial) | "two different Zoom links… couldn't get into the call" | community.zoom.com/…/25636 | 📋 next (cheap parsing win) |
| 43 | **ICS / CalDAV read-only subscriptions** (sports/school/team) | "ICS feeds are read-only… route through Google adds friction" | sportscal.io/ical-sports-calendars | ⏸ defer |
| 44 | **Attendee enrichment** (contacts + last-emailed) | category of "calendar enrichment" tools; manual lookups today | linkedin.com/help/linkedin/answer/a548295 | ⏸ defer (overlaps pre-meeting brief) |
| 45 | **Recurring agenda doc + action-item carry-over** | "carry over to-do items week to week… getting a new file every time" | support.google.com/calendar/thread/68559399 | ⏸ defer (Drive) |
| 46 | **Travel-time blocks + leave-now** (location-aware) | dead location field; manual travel padding | discussions.apple.com/thread/254842820 | ⏸ defer (routing API) |
| 47 | **Import Apple Reminders / Todoist / TickTick** | DIY syncs "lose date + attachment data"; capture-anywhere | morgen.so/notion-integration | ⏸ defer |
| 48 | **Built-in booking page** (Calendly-lite, writes back) | whole "Calendly alternative" category; want it in-calendar | calendly.com/blog | ❌ reject (needs hosted page/server) |
| 49 | **Estimate calibration coach** (personal padding multiplier) | "think emails take 30m, take 50"; nobody closes the loop | thebusinessdive.com/akiflow-vs-sunsama | ⏸ defer (needs actuals tracking) |
| 50 | **Read-only "today" summary** (daily self-email / agenda event) | planner becomes "another thing to maintain / check" | saner.ai/blogs/sunsama-reviews | ⏸ defer (gmail.send scope) |
| 51 | **Preview-before-apply for any auto-reschedule** (staged diff) | Motion "surprises when AI moves blocks… fighting the AI" | saner.ai/blogs/motion-reviews | ⏸ defer (gated on auto-reschedule) |
| 52 | **EA "acting as / multi-principal" mode** | "cannot view all calendars simultaneously in a meaningful way" | calendhub.com/blog | ⏸ defer (large) |
| 53 | **Per-person scheduling profile + VIP badges** | EAs must remember each exec's idiosyncratic rules | practicallyperfectpa.com | ⏸ defer |
| 54 | **Pencil-in tentative holds that auto-resolve** | tentative meetings cause "double, triple bookings" | learn.microsoft.com/…/4618673 | ⏸ defer |
| 55 | **Meeting notes pinned to event (+ carry-over)** | "no easy way to carry over action items week to week" | techcommunity.microsoft.com | ⏸ defer |
| 56 | **Billable-hours ledger from calendar** (tag + CSV) | "reconstructing time from memory… lose up to 70% of revenue" | rocketlane.com/blogs | ⏸ defer |
| 57 | **Weekly time audit / maker-vs-manager report** | "23 hrs/week in meetings"; maker time fragmented | paulgraham.com/makersschedule.html | 📋 next (light version) |
| 58 | **Deadline backward-planner** (scatter prep blocks) | "start 15 days prior… block recurring time before due date" | ucdenver.edu time-blocking | ⏸ defer |
| 59 | **Day theming** (assign each weekday a theme, warn on violation) | "devoting entire days to types of work… macro batching" | quidlo.com/blog/day-theming | ⏸ defer |

### This round — building #29 (all-day, fixes a bug), #30 (day/weekend views), #31 (search), #32 (notifications), #33 (export)

---

## Round 3 (2 agents: accessibility+reliability, delight+onboarding) — still producing new ideas

| # | Idea | User problem (cited) | Source | Disposition |
|---|------|----------------------|--------|-------------|
| 60 | **Non-color status encoding** (icon + aria text for tentative/declined/category) | WCAG 1.4.1: color alone fails; screen readers miss strikethrough | webaxe.org/strikethrough-html-accessibility | 📋 next (a11y) |
| 61 | **Accessible grid semantics** (self-contained aria names, live regions) | "Agenda view is the only one with screen-reader support" | support.google.com/calendar/answer/6101541 | ⏸ defer (a11y pass) |
| 62 | **Respect prefers-reduced-motion** | vestibular triggers; WCAG 2.3.3 | developer.mozilla.org prefers-reduced-motion | ✅ Built |
| 63 | **Reflow at 200%+ zoom** (rem units, agenda fallback) | "increase text size → columns overlap, text disappears" | inclusivedesigntoolkit.com/text_guidance | ⏸ defer |
| 64 | **Timezone-discrepancy badge** ("created in NY, shown local") + fixed-offset warning | "fixed offset breaks during DST"; events in wrong tz | support.google.com/calendar/answer/37064 | 📋 next |
| 65 | **Untitled-event fallback name** (synthesize from location/attendees) | events "appear without titles", become unfindable | trudigital freshdesk | ✅ Built |
| 66 | **Degenerate-duration rendering** (zero/negative/ultra-long) | zero-duration + "invisible event blocking" bugs | support.google.com/calendar/thread/147993259 | ✅ partly (min-height + end<=start guard) |
| 67 | **Partial-sync verifier** (per-calendar count/etag check) | events "show on laptop, absent on phone"; silent no-op updates | everblog.com google-calendar-not-syncing | ⏸ defer |
| 68 | **Auto-color/emoji that learns from your calendar** | "Emotify add-on"; GCal's "biggest design flaw" = color | androidpolice.com expanded-event-color | ⏸ defer (medium) |
| 69 | **Tactile completion** (settle animation + optional sound/haptic) | Things 3 "subtle, deeply satisfying animations… every interaction feels real" | macstories.net things-3 review | 🔨 this round (animation) |
| 70 | **Capture-anything paste bar w/ provenance** | Things 3 "highlight → task… works like magic"; Fantastical email-magic | macstories.net things-3 review | ⏸ defer (medium) |
| 71 | **Positive free-time framing** ("2h open this afternoon" as an asset) | users want to "celebrate and protect" free time | morgen.so aesthetic-calendar | ✅ partly (free-time chip) |
| 72 | **"Who am I meeting" face card from your own Gmail** | Vimcal dossiers loved but "don't always work"; privacy | vimcal.com; efficient.app | ⏸ defer (overlaps brief) |
| 73 | **NL correction loop** (tap a wrong chip to fix, no retype) | Vimcal NL "delightful… but doesn't always work" → retype kills magic | efficient.app/apps/vimcal | 📋 next (medium) |
| 74 | **60-second guided first-run ending in a populated calendar** | Akiflow "still figuring it out after 2 months"; want "intuitive immediately" | blog.rivva.app sunsama-vs-akiflow | ⏸ defer |
| 75 | **One-sentence menu-bar day shape** ("Free until 2, then 3 meetings") | bolt-on widgets for "at-a-glance day shape" | efficient.app/apps/notion-calendar | ⏸ defer (have next-event title) |

Round 3 still yielded ~14 novel ideas → not converged. Building #62/#65 (done) + #69; running Round 4 as a convergence test.
