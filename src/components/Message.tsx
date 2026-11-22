import { For, Match, Show, Switch, createSignal } from "solid-js";
import { renderMarkdown } from "../lib/markdown";
import type { Part, Turn } from "../lib/store";
import { approve } from "../lib/chat";

type ToolPart = Extract<Part, { kind: "tool" }>;

function ToolCard(props: { part: ToolPart; chatId: string }) {
  const [open, setOpen] = createSignal(false);
  const label = () => {
    const a = props.part.args;
    const v = a.command ?? a.path ?? a.key;
    return typeof v === "string" ? v : JSON.stringify(a);
  };
  const state = () =>
    props.part.approval === "pending" ? "pending" : props.part.output === undefined ? "running" : props.part.ok ? "ok" : "fail";
  return (
    <div class={`tool tool-${state()}`}>
      <button class="tool-head" onClick={() => setOpen(!open())}>
        <span class="tool-dot" />
        <span class="tool-name">{props.part.name}</span>
        <code class="tool-label">{label()}</code>
        <Show when={props.part.output !== undefined}><span class="chev">{open() ? "▾" : "▸"}</span></Show>
      </button>
      <Show when={props.part.approval === "pending"}>
        <div class="approval">
          <span>Allow this action?</span>
          <button class="btn btn-primary" onClick={() => approve(props.chatId, props.part, true)}>Allow</button>
          <button class="btn" onClick={() => approve(props.chatId, props.part, false)}>Deny</button>
        </div>
      </Show>
      <Show when={open() && props.part.output !== undefined}>
        <pre class="tool-out">{props.part.output}</pre>
      </Show>
    </div>
  );
}

export default function Message(props: { turn: Turn; chatId: string }) {
  return (
    <div class="turn">
      <div class="msg-user">{props.turn.user}</div>
      <div class="msg-ai">
        <For each={props.turn.parts}>
          {(p) => (
            <Switch>
              <Match when={p.kind === "text" && p}>{(t) => <div class="md" innerHTML={renderMarkdown(t().text)} />}</Match>
              <Match when={p.kind === "reasoning" && p}>
                {(t) => <details class="reasoning"><summary>Thinking</summary><div>{t().text}</div></details>}
              </Match>
              <Match when={p.kind === "tool" && p}>{(t) => <ToolCard part={t()} chatId={props.chatId} />}</Match>
              <Match when={p.kind === "memory" && p}>{(m) => <div class="note">Saved to memory: <b>{m().key}</b></div>}</Match>
              <Match when={p.kind === "error" && p}>{(e) => <div class="error">{e().text}</div>}</Match>
            </Switch>
          )}
        </For>
        <Show when={props.turn.running}>
          <div class="status"><span class="spinner" />{props.turn.status ?? "Working…"}</div>
        </Show>
      </div>
    </div>
  );
}
