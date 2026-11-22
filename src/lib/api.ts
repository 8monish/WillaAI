import { Channel, invoke } from "@tauri-apps/api/core";

export type Approval = "ask" | "auto";
export type Engine = "api" | "agy" | "codex";

export interface Settings {
  provider: string;
  custom_base_url: string;
  api_keys: Record<string, string>;
  model: string;
  engine: Engine;
  agy_model: string;
  workspace: string;
  approval: Approval;
  max_steps: number;
  command_timeout_secs: number;
  temperature: number | null;
  extra_instructions: string;
  theme: "dark" | "light";
}

/** OpenAI-format message, kept verbatim so the agent sees exact tool history. */
export interface ApiMessage {
  role: "user" | "assistant" | "tool" | "system";
  content: string | null;
  tool_calls?: unknown[];
  tool_call_id?: string;
}

export type AgentEvent =
  | { type: "status"; message: string }
  | { type: "delta"; content: string }
  | { type: "reasoning"; content: string }
  | { type: "tool_call"; id: string; name: string; args: Record<string, unknown> }
  | { type: "approval_required"; approval_id: number; tool: string; summary: string }
  | { type: "tool_result"; id: string; output: string; ok: boolean }
  | { type: "memory_saved"; key: string; value: string }
  | { type: "error"; message: string }
  | { type: "done"; messages: ApiMessage[] };

export interface Stats {
  cpu: number; mem_used: number; mem_total: number;
  disk_used: number; disk_total: number; os: string; host: string;
}

export interface EngineStatus {
  api_ready: boolean; agy: boolean; codex: boolean; platform: string;
}

export const PROVIDERS: { id: string; label: string; hint: string }[] = [
  { id: "openrouter", label: "OpenRouter", hint: "vendor/model, e.g. from openrouter.ai/models" },
  { id: "openai", label: "OpenAI", hint: "model ID from platform.openai.com" },
  { id: "anthropic", label: "Anthropic", hint: "model ID from docs.claude.com" },
  { id: "gemini", label: "Google Gemini", hint: "model ID from ai.google.dev" },
  { id: "groq", label: "Groq", hint: "model ID from console.groq.com" },
  { id: "ollama", label: "Ollama (local)", hint: "a model you pulled with `ollama pull` — no key needed" },
  { id: "custom", label: "Custom (OpenAI-compatible)", hint: "LM Studio, vLLM, llama.cpp server…" },
];

export const api = {
  chat: (req: { engine?: Engine; messages: ApiMessage[]; model?: string }, onEvent: (e: AgentEvent) => void) => {
    const ch = new Channel<AgentEvent>();
    ch.onmessage = onEvent;
    return invoke<number>("chat", { req, onEvent: ch });
  },
  cancel: (id: number) => invoke<void>("cancel_run", { id }),
  resolveApproval: (id: number, approved: boolean) => invoke<void>("resolve_approval", { id, approved }),
  getSettings: () => invoke<Settings>("get_settings"),
  saveSettings: (settings: Settings) => invoke<void>("save_settings", { settings }),
  listMemories: () => invoke<Record<string, string>>("list_memories"),
  setMemory: (key: string, value: string) => invoke<void>("set_memory", { key, value }),
  deleteMemory: (key: string) => invoke<void>("delete_memory", { key }),
  clearMemories: () => invoke<void>("clear_memories"),
  terminalExec: (command: string) => invoke<{ output: string; ok: boolean; cwd: string }>("terminal_exec", { command }),
  getCwd: () => invoke<string>("get_cwd"),
  stats: () => invoke<Stats>("system_stats"),
  engineStatus: () => invoke<EngineStatus>("engine_status"),
  listModels: () => invoke<string[]>("list_models"),
};
