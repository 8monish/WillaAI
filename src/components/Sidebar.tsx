import { For, Show, createResource, onCleanup } from "solid-js";
import { api } from "../lib/api";
import { newChat, persist, setState, state } from "../lib/store";

const gb = (b: number) => (b / 1024 ** 3).toFixed(1);

export default function Sidebar(props: { memories: Record<string, string>; refreshMemories: () => void; openSettings: () => void }) {
  const [stats, { refetch }] = createResource(api.stats);
  const t = setInterval(refetch, 4000);
  onCleanup(() => clearInterval(t));

  const chats = () => [...state.chats].sort((a, b) => b.updated - a.updated);

  function create() {
    const c = newChat();
    setState("chats", (cs) => [c, ...cs]);
    setState("activeId", c.id);
    persist();
  }

  function remove(id: string) {
    const rest = state.chats.filter((c) => c.id !== id);
    const next = rest.length ? rest : [newChat()];
    setState("chats", next);
    if (state.activeId === id) setState("activeId", next[0].id);
    persist();
  }

  return (
    <nav class="sidebar">
      <div class="brand"><img src="/logo.svg" alt="" /><span>WillaAI</span></div>
      <button class="btn btn-primary wide" onClick={create}>+ New chat</button>

      <div class="side-section grow">
        <For each={chats()}>
          {(c) => (
            <div class={`chat-item ${c.id === state.activeId ? "active" : ""}`} onClick={() => setState("activeId", c.id)}>
              <span>{c.title}</span>
              <button class="icon-btn small" title="Delete chat" onClick={(e) => { e.stopPropagation(); remove(c.id); }}>✕</button>
            </div>
          )}
        </For>
      </div>

      <details class="side-section">
        <summary>Memory ({Object.keys(props.memories).length})</summary>
        <For each={Object.entries(props.memories)} fallback={<p class="muted">Nothing saved yet.</p>}>
          {([k, v]) => (
            <div class="mem-item" title={v}>
              <b>{k}</b><span>{v}</span>
              <button class="icon-btn small" onClick={async () => { await api.deleteMemory(k); props.refreshMemories(); }}>✕</button>
            </div>
          )}
        </For>
        <Show when={Object.keys(props.memories).length}>
          <button class="btn small" onClick={async () => { await api.clearMemories(); props.refreshMemories(); }}>Clear all</button>
        </Show>
      </details>

      <Show when={stats()}>
        {(s) => (
          <div class="stats" title={`${s().host} · ${s().os}`}>
            <div><span>CPU</span><meter max="100" value={s().cpu} /><span>{s().cpu.toFixed(0)}%</span></div>
            <div><span>RAM</span><meter max={s().mem_total} value={s().mem_used} /><span>{gb(s().mem_used)}/{gb(s().mem_total)}G</span></div>
            <div><span>Disk</span><meter max={s().disk_total} value={s().disk_used} /><span>{gb(s().disk_used)}/{gb(s().disk_total)}G</span></div>
          </div>
        )}
      </Show>
      <button class="btn wide" onClick={props.openSettings}>⚙ Settings</button>
    </nav>
  );
}
