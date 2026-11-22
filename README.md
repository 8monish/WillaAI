# WillaAI

A fast, lightweight agentic AI environment. It's a native app for Linux, Windows, macOS and Android, with a Rust core and a tiny SolidJS UI.

Give it a task and the agent runs commands, reads and writes files, and remembers facts across sessions. It streams every step live, and you can approve each command before it runs.

> ⚠️ The agent acts on your real machine. Keep **Command approvals → Ask** on unless you trust the task.

## Stack

| Layer | Tech | Why |
|---|---|---|
| App shell | **Tauri 2** | Uses the OS webview instead of bundling Chromium. Installers are ~5–15 MB, and one codebase covers desktop and mobile |
| Core | **Rust**: tokio, reqwest (rustls), serde, sysinfo | Async streaming, no runtime to install, small and fast |
| UI | **SolidJS + Vite + TypeScript** | Fine-grained reactivity with no virtual DOM. ~42 KB gzipped JS |
| Markdown | marked + DOMPurify | Small and safe |

There's no Python, no Node server and no localhost port: the UI talks to Rust directly over Tauri IPC.

## Agent engines

- **Native agent (API)** is the default. Rust runs its own tool-calling loop against any OpenAI-compatible Chat Completions API: **OpenRouter, OpenAI, Anthropic, Google Gemini, Groq, Ollama (local)**, or any custom endpoint (LM Studio, vLLM, llama.cpp).
  Tools: `run_command`, `read_file`, `write_file`, `list_dir`, `remember`, `forget`.
- **Antigravity CLI (`agy`)** and **Codex CLI (`codex`)** are optional and desktop only. They show up automatically when found on `PATH`, and they run their own tool loops (with their own approvals off), exactly like the old version.

## Features

- Live streaming of text, "thinking" and tool calls, with expandable output
- Per-command **approve / deny** (or full auto mode)
- Stop button that cancels a run mid-stream and kills child processes
- Multiple chats, saved locally
- Built-in terminal panel that tracks `cd`, with history (↑/↓). Messages starting with `$ ` or `! ` run as shell commands
- Long-term memory, which you can view and delete from the sidebar
- CPU, RAM and disk stats
- Light and dark themes

## Develop

Requirements: Rust (stable), Node 20+, pnpm, plus the [Tauri system deps](https://tauri.app/start/prerequisites/). On Debian/Ubuntu:

```bash
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

```bash
pnpm install
pnpm tauri dev                 # hot-reloading dev app
cargo test --manifest-path src-tauri/Cargo.toml
```

## Build installers

```bash
pnpm tauri build               # on Linux: AppImage, .deb, .rpm
```

Each OS builds its own installers, so use CI for the rest. Push a tag and GitHub Actions (`.github/workflows/release.yml`) builds everything into a draft release:

```bash
git tag v0.2.0 && git push origin v0.2.0
```

| Platform | Output |
|---|---|
| Linux | `.AppImage`, `.deb`, `.rpm` |
| Windows | `.exe` (NSIS installer), `.msi` |
| macOS | `.dmg` for Apple Silicon and Intel |
| Android | `.apk` (unsigned, uploaded as a workflow artifact) |
| iOS | `.ipa`. Run the workflow by hand with **iOS** ticked; needs Apple signing secrets |

**Signing:** builds are unsigned by default. macOS Gatekeeper and Windows SmartScreen will warn until you add signing certificates ([Tauri signing docs](https://tauri.app/distribute/sign/)). Android needs a keystore to produce an installable release APK.

### Mobile notes

- **Android:** the native agent and its tools work (commands run in the app's sandbox through Android's `sh`). The `agy` and `codex` engines aren't available.
- **iOS:** Apple doesn't allow apps to start processes, so `run_command` and the terminal are disabled. Chat, file tools inside the app folder, and memory still work.

## Layout

```
src/                     SolidJS UI
  components/            Message, Terminal, Settings, Sidebar
  lib/                   IPC bindings, chat store, run controller
src-tauri/src/
  agent/api.rs           OpenAI-compatible streaming tool loop (+ tests)
  agent/cli.rs           agy / codex wrappers (desktop)
  tools.rs  shell.rs     tool definitions and cross-platform command runner
  memory.rs config.rs    JSON-backed memory and settings in the OS app-data folder
  commands.rs            Tauri commands exposed to the UI
```

## Roadmap

- Telegram remote control (pure Rust, HTTPS bot API)
- WhatsApp remote control as an optional sidecar
- Store API keys in the OS keychain
- Full PTY terminal (xterm.js + portable-pty)

## License

MIT
