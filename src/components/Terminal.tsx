import { For, createSignal, onMount } from "solid-js";
import { api } from "../lib/api";

interface Line { cmd: string; out: string; ok: boolean }

export default function Terminal(props: { onClose: () => void }) {
  const [lines, setLines] = createSignal<Line[]>([]);
  const [cwd, setCwd] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const hist: string[] = [];
  let hi = 0;
  let outEl!: HTMLDivElement;
  let inputEl!: HTMLInputElement;

  onMount(async () => { setCwd(await api.getCwd()); inputEl.focus(); });

  async function run(cmd: string) {
    if (!cmd.trim()) return;
    if (cmd.trim() === "clear") { setLines([]); return; }
    hist.push(cmd); hi = hist.length;
    setBusy(true);
    const r = await api.terminalExec(cmd).catch((e) => ({ output: String(e), ok: false, cwd: cwd() }));
    setLines((l) => [...l, { cmd, out: r.output, ok: r.ok }]);
    setCwd(r.cwd);
    setBusy(false);
    queueMicrotask(() => (outEl.scrollTop = outEl.scrollHeight));
    inputEl.focus();
  }

  return (
    <aside class="terminal">
      <header>
        <span class="term-cwd" title={cwd()}>{cwd()}</span>
        <button class="icon-btn" title="Clear" onClick={() => setLines([])}>⌫</button>
        <button class="icon-btn" title="Close" onClick={props.onClose}>✕</button>
      </header>
      <div class="term-out" ref={outEl}>
        <For each={lines()}>
          {(l) => (<><div class="term-cmd">$ {l.cmd}</div><pre class={l.ok ? "" : "term-err"}>{l.out}</pre></>)}
        </For>
      </div>
      <form class="term-in" onSubmit={(e) => { e.preventDefault(); const v = inputEl.value; inputEl.value = ""; run(v); }}>
        <span>$</span>
        <input ref={inputEl} disabled={busy()} spellcheck={false} autocomplete="off" placeholder={busy() ? "running…" : "command"}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" && hi > 0) { hi--; inputEl.value = hist[hi]; e.preventDefault(); }
            if (e.key === "ArrowDown") { hi = Math.min(hist.length, hi + 1); inputEl.value = hist[hi] ?? ""; e.preventDefault(); }
          }} />
      </form>
    </aside>
  );
}
