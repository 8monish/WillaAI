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
- **Self-updating:** checks GitHub Releases on startup, then downloads with a progress bar, installs and restarts. Updates are signed, so the app only installs builds made with this project's key
- **Remote control (optional):**
  - **Telegram:** create a bot with @BotFather, paste the token in Settings, then send `/start <code>` to pair. Pure Rust, nothing to install
  - **WhatsApp:** click *Install WhatsApp support*. This uses your Node.js 18+ or downloads a private copy, installs whatsapp-web.js, and reuses your Chrome, Chromium or Edge. Then scan the QR code and message yourself to control the app
  - Only the paired account is obeyed, and commands ask for "yes/no" in the chat unless you change that

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

## Releasing and updates

1. Add the updater signing key as a repo secret named `TAURI_SIGNING_PRIVATE_KEY` (and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` if it has one). Keep a backup of the key: **if it's lost, installed apps can't update anymore.**
2. Bump `version` in `package.json`, `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml`.
3. `git tag vX.Y.Z && git push origin vX.Y.Z`

CI publishes the release with installers, signed update bundles and `latest.json`. Running apps pick it up on their next launch.

Self-update works for the Windows installer (`.exe`/`.msi`), macOS (`.app`/`.dmg`) and Linux **AppImage**. The `.deb` and `.rpm` packages update through your package manager instead.

### Windows

Users download `WillaAI_x.y.z_x64-setup.exe` from the release page. It installs per-user, with no admin needed, adds Start-menu and desktop shortcuts, and fetches WebView2 if it's missing. Updates install silently with a progress bar. The `.msi` is there for IT-managed installs.

## Roadmap

- Store API keys in the OS keychain
- Full PTY terminal (xterm.js + portable-pty)

## License

MIT
