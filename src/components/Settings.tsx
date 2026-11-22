import { For, Show, createSignal, onMount } from "solid-js";
import { getVersion } from "@tauri-apps/api/app";
import RemoteControl from "./RemoteControl";
import { checkForUpdate, error as updError, installUpdate, phase, update } from "../lib/updater";
import { createStore, unwrap } from "solid-js/store";
import { api, PROVIDERS, type Settings as S, type EngineStatus } from "../lib/api";

export default function Settings(props: { initial: S; status?: EngineStatus; onClose: (saved?: S) => void }) {
  const [s, set] = createStore<S>(structuredClone(props.initial));
  const [models, setModels] = createSignal<string[]>([]);
  const [msg, setMsg] = createSignal("");
  const provider = () => PROVIDERS.find((p) => p.id === s.provider)!;
  const [version, setVersion] = createSignal("");
  onMount(async () => setVersion(await getVersion()));

  async function fetchModels() {
    setMsg("Fetching models…");
    try {
      await api.saveSettings(unwrap(s));
      const m = await api.listModels();
      setModels(m);
      setMsg(m.length ? `${m.length} models` : "No models returned");
    } catch (e) { setMsg(String(e)); }
  }

  async function save() {
    try { await api.saveSettings(unwrap(s)); props.onClose(structuredClone(unwrap(s))); }
    catch (e) { setMsg(String(e)); }
  }

  return (
    <div class="overlay" onClick={(e) => e.target === e.currentTarget && props.onClose()}>
      <div class="modal">
        <header><h2>Settings</h2><button class="icon-btn" onClick={() => props.onClose()}>✕</button></header>
        <div class="modal-body">
          <section>
            <h3>Model provider</h3>
            <label>Provider
              <select value={s.provider} onChange={(e) => { set("provider", e.currentTarget.value); setModels([]); }}>
                <For each={PROVIDERS}>{(p) => <option value={p.id}>{p.label}</option>}</For>
              </select>
            </label>
            <Show when={s.provider === "custom"}>
              <label>Base URL<input value={s.custom_base_url} placeholder="http://localhost:1234/v1"
                onInput={(e) => set("custom_base_url", e.currentTarget.value)} /></label>
            </Show>
            <Show when={s.provider !== "ollama"}>
              <label>API key<input type="password" value={s.api_keys[s.provider] ?? ""} placeholder="Stored locally on this device"
                onInput={(e) => set("api_keys", s.provider, e.currentTarget.value)} /></label>
            </Show>
            <label>Model
              <div class="row">
                <input list="model-list" value={s.model} placeholder={provider().hint} onInput={(e) => set("model", e.currentTarget.value)} />
                <button class="btn" onClick={fetchModels}>Fetch models</button>
              </div>
              <datalist id="model-list"><For each={models()}>{(m) => <option value={m} />}</For></datalist>
            </label>
          </section>

          <section>
            <h3>Agent</h3>
            <label>Default engine
              <select value={s.engine} onChange={(e) => set("engine", e.currentTarget.value as S["engine"])}>
                <option value="api">Native agent (API)</option>
                <option value="agy" disabled={!props.status?.agy}>Antigravity CLI (agy){props.status?.agy ? "" : " — not found"}</option>
                <option value="codex" disabled={!props.status?.codex}>Codex CLI{props.status?.codex ? "" : " — not found"}</option>
              </select>
            </label>
            <Show when={s.engine === "agy"}>
              <label>agy model<input value={s.agy_model} onInput={(e) => set("agy_model", e.currentTarget.value)} /></label>
            </Show>
            <label>Command approvals
              <select value={s.approval} onChange={(e) => set("approval", e.currentTarget.value as S["approval"])}>
                <option value="ask">Ask before running commands or writing files</option>
                <option value="auto">Run everything automatically</option>
              </select>
            </label>
            <Show when={s.approval === "auto"}><p class="warn">The agent will run any command without asking. Only use this on a machine you're happy to let it change.</p></Show>
            <div class="row">
              <label>Max steps<input type="number" min="1" max="200" value={s.max_steps} onInput={(e) => set("max_steps", +e.currentTarget.value || 25)} /></label>
              <label>Command timeout (s)<input type="number" min="1" value={s.command_timeout_secs} onInput={(e) => set("command_timeout_secs", +e.currentTarget.value || 60)} /></label>
            </div>
            <label>Workspace folder<input value={s.workspace} placeholder="Defaults to your home folder" onInput={(e) => set("workspace", e.currentTarget.value)} /></label>
            <label>Extra instructions<textarea rows="3" value={s.extra_instructions} placeholder="Anything the agent should always know or do"
              onInput={(e) => set("extra_instructions", e.currentTarget.value)} /></label>
          </section>

          <RemoteControl s={s} set={set} saved={props.initial} />

          <Show when={props.status?.desktop}>
            <section>
              <h3>Updates</h3>
              <div class="row-inline">
                <span>WillaAI {version()} — {
                  phase() === "checking" ? "checking…" :
                  phase() === "none" ? "you're up to date" :
                  phase() === "available" ? `version ${update()?.version} is available` :
                  phase() === "downloading" || phase() === "installing" ? "updating…" :
                  phase() === "error" ? `couldn't check (${updError()})` : ""
                }</span>
                <Show when={phase() === "available"} fallback={<button class="btn small" onClick={checkForUpdate}>Check now</button>}>
                  <button class="btn btn-primary small" onClick={installUpdate}>Update now</button>
                </Show>
              </div>
              <label class="check"><input type="checkbox" checked={s.auto_update} onChange={(e) => set("auto_update", e.currentTarget.checked)} />
                Check for updates when WillaAI starts</label>
            </section>
          </Show>

          <section>
            <h3>Appearance</h3>
            <label>Theme
              <select value={s.theme} onChange={(e) => set("theme", e.currentTarget.value as S["theme"])}>
                <option value="dark">Dark</option><option value="light">Light</option>
              </select>
            </label>
          </section>
        </div>
        <footer><span class="muted">{msg()}</span><button class="btn" onClick={() => props.onClose()}>Cancel</button><button class="btn btn-primary" onClick={save}>Save</button></footer>
      </div>
    </div>
  );
}
