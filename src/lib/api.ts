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

  /** Read all Google Tasks across the user's lists. */
  async listTasks(): Promise<TaskDto[]> {
    if (!isTauri) return [];
    return invoke<TaskDto[]>("tasks_list");
  },

  async setTaskStatus(listId: string, id: string, completed: boolean): Promise<void> {
    if (!isTauri) return;
    return invoke<void>("task_set_status", { listId, id, completed });
  },

  async createTask(listId: string, title: string, due: string | null): Promise<TaskDto> {
    return invoke<TaskDto>("task_create", { listId, title, due });
  },
};

