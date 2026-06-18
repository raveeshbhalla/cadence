// Typed bridge to the Rust backend. In a plain browser (no Tauri) the calls
// fall back to mock behaviour so the web preview keeps working.

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

export interface Account {
  email: string;
}

export interface TaskDto {
  id: string;
  listId: string;
  listTitle: string;
  title: string;
  status: "needsAction" | "completed";
  due: string | null; // YYYY-MM-DD
  completed: string | null; // RFC3339
  notes: string | null;
  fromEmail: boolean;
  emailThreadId: string | null;
}

export interface EventDto {
  id: string;
  title: string;
  start: string; // RFC3339 dateTime, or YYYY-MM-DD for all-day
  end: string;
  allDay: boolean;
  cadenceTaskId: string | null;
  calendarId: string;
  color: string;
  location: string | null;
  description: string | null;
  hangoutLink: string | null;
  declined: boolean;
  timeZone: string | null;
}

export interface CalendarDto {
  id: string;
  summary: string;
  color: string;
  primary: boolean;
}

export interface EmailDto {
  id: string;
  threadId: string;
  sender: string;
  subject: string;
}

export interface AiParse {
  title: string;
  date: string | null; // YYYY-MM-DD
  time: number | null; // minutes from midnight
  durationMin: number | null;
  list: string | null;
}

export const api = {
  /** Begin Google OAuth (opens the system browser). Resolves when connected. */
  async googleSignIn(): Promise<Account> {
    if (!isTauri) {
      await new Promise((r) => setTimeout(r, 1200));
      return { email: "alex@gmail.com" };
    }
    return invoke<Account>("google_sign_in");
  },

  /** The currently signed-in account, or null. */
  async authStatus(): Promise<Account | null> {
    if (!isTauri) return null;
    return invoke<Account | null>("auth_status");
  },

  async signOut(): Promise<void> {
    if (!isTauri) return;
    return invoke<void>("sign_out");
  },

  /** Set the macOS menu-bar title (next meeting / task). */
  async setTrayTitle(text: string): Promise<void> {
    if (!isTauri) return;
    return invoke<void>("set_tray_title", { text });
  },

  /** Write a data export to Downloads. Returns the file path. */
  async exportData(json: string, csv: string): Promise<string> {
    return invoke<string>("export_data", { json, csv });
  },

  /** Fire a native notification (requests permission once). */
  async notify(title: string, body: string): Promise<void> {
    if (!isTauri) return;
    const n = await import("@tauri-apps/plugin-notification");
    let granted = await n.isPermissionGranted();
    if (!granted) granted = (await n.requestPermission()) === "granted";
    if (granted) n.sendNotification({ title, body });
  },

  /** Open a URL in the default browser. */
  async openUrl(url: string): Promise<void> {
    if (!isTauri) {
      window.open(url, "_blank");
      return;
    }
    return invoke<void>("open_url", { url });
  },

  /** Read all Google Tasks across the user's lists. */
  async listTasks(): Promise<TaskDto[]> {
    if (!isTauri) return [];
    return invoke<TaskDto[]>("tasks_list");
  },

  async setTaskStatus(listId: string, id: string, completed: boolean): Promise<void> {
    if (!isTauri) return;
    return invoke<void>("task_set_status", { listId, id, completed });
  },

  async createTask(listId: string, title: string, due: string | null, notes: string | null = null): Promise<TaskDto> {
    return invoke<TaskDto>("task_create", { listId, title, due, notes });
  },

  async setTaskTitle(listId: string, id: string, title: string): Promise<void> {
    return invoke<void>("task_set_title", { listId, id, title });
  },

  async setTaskDue(listId: string, id: string, due: string | null): Promise<void> {
    return invoke<void>("task_set_due", { listId, id, due });
  },

  async deleteTask(listId: string, id: string): Promise<void> {
    return invoke<void>("task_delete", { listId, id });
  },

  /** List events across all calendars in [timeMin, timeMax] (RFC3339). */
  async listEvents(timeMin: string, timeMax: string): Promise<EventDto[]> {
    if (!isTauri) return [];
    return invoke<EventDto[]>("events_list", { timeMin, timeMax });
  },

  /** The user's calendar list. */
  async listCalendars(): Promise<CalendarDto[]> {
    if (!isTauri) return [];
    return invoke<CalendarDto[]>("calendars_list");
  },

  /** Search events across all calendars in [timeMin, timeMax]. */
  async searchEvents(q: string, timeMin: string, timeMax: string): Promise<EventDto[]> {
    if (!isTauri) return [];
    return invoke<EventDto[]>("events_search", { q, timeMin, timeMax });
  },

  /** Create a time-block event linked to a task. Returns the event id. */
  async createEvent(title: string, start: string, end: string, taskId: string): Promise<string> {
    return invoke<string>("event_create", { title, start, end, taskId });
  },

  /** Create a plain calendar event (a meeting). Returns the event id. */
  async createMeeting(title: string, start: string, end: string): Promise<string> {
    return invoke<string>("event_create_meeting", { title, start, end });
  },

  async updateEvent(eventId: string, start: string, end: string): Promise<void> {
    return invoke<void>("event_update", { eventId, start, end });
  },

  async setEventTitle(eventId: string, title: string): Promise<void> {
    return invoke<void>("event_set_title", { eventId, title });
  },

  async deleteEvent(eventId: string): Promise<void> {
    return invoke<void>("event_delete", { eventId });
  },

  /** Unreplied Primary-inbox messages. */
  async listEmails(): Promise<EmailDto[]> {
    if (!isTauri) return [];
    return invoke<EmailDto[]>("gmail_unreplied");
  },

  /** Archive a Gmail thread (remove it from the inbox). */
  async archiveEmail(threadId: string): Promise<void> {
    if (!isTauri) return;
    return invoke<void>("gmail_archive", { threadId });
  },

  /** Parse a capture line with the model (locale-aware). Throws if unavailable. */
  async aiParse(text: string, today: string): Promise<AiParse> {
    const locale = typeof navigator !== "undefined" ? navigator.language : "en-US";
    return invoke<AiParse>("ai_parse", { text, today, locale });
  },
};

