import { For, Show, createEffect, createResource, createSignal, onMount } from "solid-js";
import { api, type Engine, type Settings as S } from "./lib/api";
import { activeChat } from "./lib/store";
import { isRunning, send, stop } from "./lib/chat";
import Message from "./components/Message";
import Sidebar from "./components/Sidebar";
import Terminal from "./components/Terminal";
import Settings from "./components/Settings";

export default function App() {
  const [settings, setSettings] = createSignal<S>();
  const [status, { refetch: refetchStatus }] = createResource(api.engineStatus);
  const [memories, { refetch: refetchMemories }] = createResource(api.listMemories, { initialValue: {} });
  const [engine, setEngine] = createSignal<Engine>("api");
  const [showTerm, setShowTerm] = createSignal(false);
  const [showSettings, setShowSettings] = createSignal(false);
  const [sidebarOpen, setSidebarOpen] = createSignal(window.innerWidth > 800);
  let inputEl!: HTMLTextAreaElement;
  let scrollEl!: HTMLDivElement;

  onMount(async () => {
    const s = await api.getSettings();
    setSettings(s);
    setEngine(s.engine);
    if (!s.model && s.engine === "api") setShowSettings(true);
  });

  createEffect(() => document.documentElement.setAttribute("data-theme", settings()?.theme ?? "dark"));

  // Keep the newest output in view while a run streams.
  createEffect(() => {
    const t = activeChat().turns;
    void JSON.stringify(t[t.length - 1]?.parts);
    const nearBottom = scrollEl && scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 200;
    if (nearBottom) queueMicrotask(() => (scrollEl.scrollTop = scrollEl.scrollHeight));
  });

  function submit() {
    const text = inputEl.value.trim();
    if (!text || isRunning(activeChat().id)) return;
    inputEl.value = "";
    inputEl.style.height = "";
    send(text, engine(), refetchMemories);
    queueMicrotask(() => (scrollEl.scrollTop = scrollEl.scrollHeight));
  }

  const running = () => isRunning(activeChat().id);

  return (
    <div class="app">
      <Show when={sidebarOpen()}>
        <Sidebar memories={memories()} refreshMemories={refetchMemories} openSettings={() => setShowSettings(true)} />
      </Show>

      <main class="main">
        <header class="topbar">
          <button class="icon-btn" title="Toggle sidebar" onClick={() => setSidebarOpen(!sidebarOpen())}>☰</button>
          <span class="title">{activeChat().title}</span>
          <select class="engine" value={engine()} onChange={(e) => setEngine(e.currentTarget.value as Engine)} title="Agent engine">
            <option value="api">{settings()?.model || "Native agent"}</option>
            <Show when={status()?.agy}><option value="agy">agy · {settings()?.agy_model}</option></Show>
            <Show when={status()?.codex}><option value="codex">codex</option></Show>
          </select>
          <Show when={status()?.platform !== "ios"}>
            <button class={`icon-btn ${showTerm() ? "on" : ""}`} title="Terminal" onClick={() => setShowTerm(!showTerm())}>{">_"}</button>
          </Show>
        </header>

        <div class="content">
          <div class="messages" ref={scrollEl}>
            <Show when={activeChat().turns.length} fallback={
              <div class="empty">
                <img src="/logo.svg" alt="" />
                <h1>What should Willa do?</h1>
                <p class="muted">Ask a question or give it a task on this machine. Start a message with <code>$</code> to run a shell command directly.</p>
              </div>
            }>
              <For each={activeChat().turns}>{(t) => <Message turn={t} chatId={activeChat().id} />}</For>
            </Show>
          </div>
          <Show when={showTerm()}><Terminal onClose={() => setShowTerm(false)} /></Show>
        </div>

        <form class="composer" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <textarea ref={inputEl} rows="1" placeholder="Message Willa…  (Enter to send, Shift+Enter for a new line)"
            onInput={(e) => { const el = e.currentTarget; el.style.height = ""; el.style.height = Math.min(el.scrollHeight, 240) + "px"; }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); submit(); } }} />
          <Show when={running()} fallback={<button class="btn btn-primary" type="submit">Send</button>}>
            <button class="btn btn-danger" type="button" onClick={() => stop(activeChat().id)}>Stop</button>
          </Show>
        </form>
      </main>

      <Show when={showSettings() && settings()}>
        <Settings initial={settings()!} status={status()} onClose={(saved) => {
          setShowSettings(false);
          if (saved) { setSettings(saved); setEngine(saved.engine); refetchStatus(); }
        }} />
      </Show>
    </div>
  );
}
