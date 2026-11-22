import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api, type IntegrationStatus, type Settings } from "../lib/api";

/** Settings → Remote control: optional Telegram and WhatsApp linking. */
export default function RemoteControl(props: { s: Settings; set: SetStoreFunction<Settings>; saved: Settings }) {
  const [st, setSt] = createSignal<IntegrationStatus>();
  const [showLog, setShowLog] = createSignal(false);
  let logEl: HTMLPreElement | undefined;

  onMount(async () => {
    setSt(await api.integrationStatus());
    const un = await listen<IntegrationStatus>("integrations", (e) => {
      setSt(e.payload);
      queueMicrotask(() => logEl && (logEl.scrollTop = logEl.scrollHeight));
    });
    onCleanup(un);
  });

  const tg = () => st()?.telegram;
  const wa = () => st()?.whatsapp;
  const tokenDirty = () => props.s.telegram.bot_token !== props.saved.telegram.bot_token
    || props.s.telegram.enabled !== props.saved.telegram.enabled;
  const waDirty = () => props.s.whatsapp.enabled !== props.saved.whatsapp.enabled;

  return (
    <section>
      <h3>Remote control <span class="tag">optional</span></h3>
      <p class="hint">Control WillaAI from your phone. Only your own account is obeyed, and commands still need your approval unless you change that below.</p>

      {/* Telegram */}
      <div class="integration">
        <div class="int-head">
          <b>Telegram</b>
          <span class={`pill ${tg()?.running ? (tg()?.paired ? "ok" : "warn") : ""}`}>
            {tg()?.error ? "error" : tg()?.running ? (tg()?.paired ? "connected" : "waiting to pair") : "off"}
          </span>
          <label class="switch"><input type="checkbox" checked={props.s.telegram.enabled}
            onChange={(e) => props.set("telegram", "enabled", e.currentTarget.checked)} /><span /></label>
        </div>
        <Show when={props.s.telegram.enabled}>
          <label>Bot token
            <input type="password" value={props.s.telegram.bot_token} placeholder="123456:ABC-…"
              onInput={(e) => props.set("telegram", "bot_token", e.currentTarget.value.trim())} />
          </label>
          <p class="hint">Create a bot with <a href="#" onClick={(e) => { e.preventDefault(); openUrl("https://t.me/BotFather"); }}>@BotFather</a> (send <code>/newbot</code>) and paste its token. Nothing to install.</p>
          <Show when={tokenDirty()}><p class="hint warn-text">Save to connect.</p></Show>
          <Show when={!tokenDirty()}>
            <Show when={tg()?.error}><p class="error small">{tg()!.error}</p></Show>
            <Show when={tg()?.pair_code}>
              <div class="pair">
                <span>Open <b>@{tg()?.bot_username}</b> in Telegram and send:</span>
                <code class="code-big">/start {tg()?.pair_code}</code>
              </div>
            </Show>
            <Show when={tg()?.paired}>
              <div class="row-inline"><span>Paired with your Telegram account via <b>@{tg()?.bot_username}</b>.</span>
                <button class="btn small" onClick={() => api.telegramUnpair()}>Unpair</button></div>
            </Show>
          </Show>
        </Show>
      </div>

      {/* WhatsApp */}
      <div class="integration">
        <div class="int-head">
          <b>WhatsApp</b>
          <span class={`pill ${wa()?.state === "ready" ? "ok" : wa()?.state === "error" ? "bad" : wa()?.state === "off" ? "" : "warn"}`}>
            {!wa()?.supported ? "desktop only" : !wa()?.installed && wa()?.state !== "installing" ? "not installed" : wa()?.state}
          </span>
          <Show when={wa()?.installed}>
            <label class="switch"><input type="checkbox" checked={props.s.whatsapp.enabled}
              onChange={(e) => props.set("whatsapp", "enabled", e.currentTarget.checked)} /><span /></label>
          </Show>
        </div>
        <Show when={wa()?.supported}>
          <Show when={!wa()?.installed}>
            <p class="hint">Needs extra components: Node.js (downloaded automatically if you don't have it, ≈30 MB) and the WhatsApp Web library. Your installed Chrome, Chromium or Edge is reused; if you have none, Chromium is downloaded (≈170 MB).</p>
            <button class="btn btn-primary" disabled={wa()?.state === "installing"} onClick={() => { api.whatsappInstall(); setShowLog(true); }}>
              {wa()?.state === "installing" ? "Installing…" : "Install WhatsApp support"}
            </button>
          </Show>
          <Show when={wa()?.installed && waDirty()}><p class="hint warn-text">Save to {props.s.whatsapp.enabled ? "start" : "stop"} WhatsApp.</p></Show>
          <Show when={wa()?.message}><p class="hint">{wa()!.message}</p></Show>
          <Show when={wa()?.qr_svg}><div class="qr" innerHTML={wa()!.qr_svg!} /></Show>
          <Show when={wa()?.state === "ready"}>
            <div class="row-inline"><span>Linked to <b>+{wa()?.me}</b>. Open your own chat ("Message yourself") and send a task.</span>
              <button class="btn small" onClick={() => api.whatsappLogout()}>Unlink</button></div>
          </Show>
          <Show when={wa()?.state === "error" && wa()?.installed}>
            <button class="btn small" onClick={() => api.whatsappRestart()}>Retry</button>
          </Show>
          <Show when={wa()?.log.length}>
            <button class="link-btn" onClick={() => setShowLog(!showLog())}>{showLog() ? "Hide" : "Show"} details</button>
            <Show when={showLog()}><pre class="log" ref={logEl}><For each={wa()!.log}>{(l) => <>{l}{"\n"}</>}</For></pre></Show>
          </Show>
        </Show>
      </div>

      <label>Commands from your phone
        <select value={props.s.remote_approval} onChange={(e) => props.set("remote_approval", e.currentTarget.value as Settings["remote_approval"])}>
          <option value="ask">Ask me in the chat first (reply yes / no)</option>
          <option value="auto">Run automatically</option>
        </select>
      </label>
    </section>
  );
}
