import { Match, Show, Switch, createSignal } from "solid-js";
import { error, installUpdate, phase, progress, update } from "../lib/updater";

/** Launcher-style update bar: shows when a new version is out, then download progress. */
export default function UpdateBanner() {
  const [hidden, setHidden] = createSignal(false);
  const visible = () => !hidden() && ["available", "downloading", "installing", "ready"].includes(phase())
    || (phase() === "error" && !!update() && !hidden());
  const pct = () => Math.round(progress() * 100);

  return (
    <Show when={visible()}>
      <div class="update-bar">
        <Switch>
          <Match when={phase() === "available"}>
            <span>⬆ <b>WillaAI {update()?.version}</b> is available (you have {update()?.currentVersion}).</span>
            <Show when={update()?.body}><details><summary>What's new</summary><pre>{update()?.body}</pre></details></Show>
            <button class="btn btn-primary" onClick={installUpdate}>Update now</button>
            <button class="icon-btn" title="Later" onClick={() => setHidden(true)}>✕</button>
          </Match>
          <Match when={phase() === "downloading"}>
            <span>Downloading {update()?.version}… {progress() >= 0 ? `${pct()}%` : ""}</span>
            <div class="progress"><div style={{ width: progress() >= 0 ? `${pct()}%` : "100%" }} classList={{ indeterminate: progress() < 0 }} /></div>
          </Match>
          <Match when={phase() === "installing" || phase() === "ready"}>
            <span><span class="spinner" /> Installing and restarting…</span>
          </Match>
          <Match when={phase() === "error"}>
            <span class="err">Update failed: {error()}</span>
            <button class="btn" onClick={installUpdate}>Retry</button>
            <button class="icon-btn" onClick={() => setHidden(true)}>✕</button>
          </Match>
        </Switch>
      </div>
    </Show>
  );
}
