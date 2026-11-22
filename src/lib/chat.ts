import { api, type AgentEvent, type Engine } from "./api";
import { activeChat, state, updateChat, type Part, type Turn } from "./store";
import { createSignal } from "solid-js";

/** chatId -> runId of the agent run in progress */
const [runs, setRuns] = createSignal<Record<string, number>>({});
export const isRunning = (chatId: string) => runs()[chatId] !== undefined;

const lastTurn = (c: { turns: Turn[] }) => c.turns[c.turns.length - 1];

function apply(t: Turn, e: AgentEvent) {
  const last = t.parts[t.parts.length - 1];
  switch (e.type) {
    case "status": t.status = e.message; break;
    case "delta":
      if (last?.kind === "text") last.text += e.content; else t.parts.push({ kind: "text", text: e.content });
      t.status = undefined;
      break;
    case "reasoning":
      if (last?.kind === "reasoning") last.text += e.content; else t.parts.push({ kind: "reasoning", text: e.content });
      break;
    case "tool_call": t.parts.push({ kind: "tool", id: e.id, name: e.name, args: e.args }); t.status = `Running ${e.name}…`; break;
    case "approval_required": {
      const tool = [...t.parts].reverse().find((p): p is Extract<Part, { kind: "tool" }> => p.kind === "tool" && p.output === undefined);
      if (tool) { tool.approvalId = e.approval_id; tool.approval = "pending"; }
      t.status = "Waiting for your approval";
      break;
    }
    case "tool_result": {
      const tool = t.parts.find((p): p is Extract<Part, { kind: "tool" }> => p.kind === "tool" && p.id === e.id);
      if (tool) { tool.output = e.output; tool.ok = e.ok; if (tool.approval === "pending") tool.approval = undefined; }
      t.status = undefined;
      break;
    }
    case "memory_saved": t.parts.push({ kind: "memory", key: e.key, value: e.value }); break;
    case "error": t.parts.push({ kind: "error", text: e.message }); break;
    case "done": t.running = false; t.status = undefined; break;
  }
}

export async function send(text: string, engine: Engine, onMemory: () => void) {
  const chat = activeChat();
  const id = chat.id;
  if (isRunning(id)) return;

  // `$ cmd` or `! cmd` runs straight in the shell, like the old terminal shortcut.
  const shell = text.match(/^[$!]\s+([\s\S]+)/);
  if (shell) {
    const cmd = shell[1];
    updateChat(id, (c) => { c.turns.push({ user: text, parts: [{ kind: "tool", id: "sh", name: "run_command", args: { command: cmd } }], running: true }); });
    const r = await api.terminalExec(cmd).catch((e) => ({ output: String(e), ok: false, cwd: "" }));
    updateChat(id, (c) => { const t = lastTurn(c); const p = t.parts[0] as Extract<Part, { kind: "tool" }>; p.output = r.output; p.ok = r.ok; t.running = false; });
    return;
  }

  updateChat(id, (c) => {
    if (!c.turns.length) c.title = text.slice(0, 60);
    c.history.push({ role: "user", content: text });
    c.turns.push({ user: text, parts: [], running: true, status: "Starting…" });
    c.updated = Date.now();
  });

  const history = JSON.parse(JSON.stringify(activeChat().history));
  try {
    const runId = await api.chat({ engine, messages: history }, (e) => {
      updateChat(id, (c) => {
        apply(lastTurn(c), e);
        if (e.type === "done") c.history.push(...e.messages);
      });
      if (e.type === "memory_saved") onMemory();
      if (e.type === "done") setRuns(({ [id]: _, ...rest }) => rest);
    });
    // The run may already have finished before invoke resolved.
    if (lastTurn(activeChatById(id))?.running) setRuns((r) => ({ ...r, [id]: runId }));
  } catch (err) {
    updateChat(id, (c) => { const t = lastTurn(c); t.parts.push({ kind: "error", text: String(err) }); t.running = false; t.status = undefined; });
  }
}

const activeChatById = (id: string) => state.chats.find((c) => c.id === id)!;

export function stop(chatId: string) {
  const runId = runs()[chatId];
  if (runId !== undefined) api.cancel(runId);
}

export function approve(chatId: string, part: Extract<Part, { kind: "tool" }>, ok: boolean) {
  if (part.approvalId === undefined) return;
  api.resolveApproval(part.approvalId, ok);
  updateChat(chatId, (c) => {
    for (const t of c.turns) for (const p of t.parts)
      if (p.kind === "tool" && p.approvalId === part.approvalId) p.approval = ok ? "approved" : "denied";
  });
}
