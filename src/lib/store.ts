import { createStore, produce } from "solid-js/store";
import type { ApiMessage } from "./api";

export type Part =
  | { kind: "text"; text: string }
  | { kind: "reasoning"; text: string }
  | { kind: "tool"; id: string; name: string; args: Record<string, unknown>; output?: string; ok?: boolean;
      approvalId?: number; approval?: "pending" | "approved" | "denied" }
  | { kind: "error"; text: string }
  | { kind: "memory"; key: string; value: string };

export interface Turn {
  user: string;
  parts: Part[];
  status?: string;
  running: boolean;
}

export interface Chat {
  id: string;
  title: string;
  updated: number;
  history: ApiMessage[];
  turns: Turn[];
}

const KEY = "willa.chats.v1";

function load(): Chat[] {
  try {
    const chats: Chat[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    // A run can't survive a restart; clear stale running flags.
    for (const c of chats) for (const t of c.turns) { t.running = false; t.status = undefined; }
    return chats;
  } catch {
    return [];
  }
}

export const newChat = (): Chat => ({ id: crypto.randomUUID(), title: "New chat", updated: Date.now(), history: [], turns: [] });

const initial = load();
export const [state, setState] = createStore<{ chats: Chat[]; activeId: string }>({
  chats: initial.length ? initial : [newChat()],
  activeId: "",
});
if (!state.activeId) setState("activeId", state.chats[0].id);

let saveTimer: number | undefined;
export function persist() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state.chats)); } catch { /* quota: ignore */ }
  }, 300);
}

export const activeChat = () => state.chats.find((c) => c.id === state.activeId)!;

export function updateChat(id: string, fn: (c: Chat) => void) {
  setState("chats", (c) => c.id === id, produce(fn));
  persist();
}
