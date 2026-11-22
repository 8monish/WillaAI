# WillaAI

[![CI](https://github.com/8monish/WillaAI/actions/workflows/ci.yml/badge.svg)](https://github.com/8monish/WillaAI/actions/workflows/ci.yml)
[![Latest release](https://img.shields.io/github/v/release/8monish/WillaAI)](https://github.com/8monish/WillaAI/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A fast, lightweight agentic AI environment. It's a native desktop app for Linux, Windows and macOS, with a Rust core and a tiny SolidJS UI.

Give it a task and the agent runs commands, reads and writes files, and remembers facts across sessions. It streams every step live, and you can approve each command before it runs.

> ⚠️ The agent acts on your real machine. Keep **Command approvals → Ask** on unless you trust the task.

## Install

Download the file for your system from the [latest release](https://github.com/8monish/WillaAI/releases/latest).

| System | File | How to install |
|---|---|---|
| Windows 10/11 | `WillaAI_<version>_x64-setup.exe` | Run it. If SmartScreen says "Windows protected your PC", click **More info → Run anyway**. A `.msi` is also provided for managed installs |
| macOS (Apple Silicon: M1 and later) | `WillaAI_<version>_aarch64.dmg` | Open it and drag WillaAI into Applications (see the macOS note below) |
| macOS (Intel) | `WillaAI_<version>_x64.dmg` | Same as above |
| Ubuntu, Debian, Mint | `WillaAI_<version>_amd64.deb` | `sudo apt install ./WillaAI_<version>_amd64.deb` |
| Fedora, openSUSE | `WillaAI-<version>-1.x86_64.rpm` | `sudo dnf install ./WillaAI-<version>-1.x86_64.rpm` |
| Any Linux (Arch etc.) | `WillaAI_<version>_amd64.AppImage` | `chmod +x WillaAI_*.AppImage` and run it |

**macOS note:** the app isn't notarized by Apple yet, so the first launch says it "can't be opened" or "is damaged". Run this once, then open it normally:

```bash
xattr -dr com.apple.quarantine /Applications/WillaAI.app
```

**Check your download (optional):** each release includes `SHA256SUMS.txt`. Run `sha256sum -c SHA256SUMS.txt --ignore-missing` in the folder you downloaded to.

After installing, open **Settings**, pick a provider (OpenRouter, OpenAI, Anthropic, Gemini, Groq, or a local Ollama) and paste your API key.

## Stack

| Layer | Tech | Why |
|---|---|---|
| App shell | **Tauri 2** | Uses the OS webview instead of bundling Chromium. Installers are 2–3 MB (the AppImage is larger because it bundles its own libraries) |
| Core | **Rust**: tokio, reqwest (rustls), serde, sysinfo | Async streaming, no runtime to install, small and fast |
| UI | **SolidJS + Vite + TypeScript** | Fine-grained reactivity with no virtual DOM |
| Markdown | marked + DOMPurify | Small and safe |

There's no Python, no Node server and no localhost port: the UI talks to Rust directly over Tauri IPC.

## Agent engines

- **Native agent (API)** is the default. Rust runs its own tool-calling loop against any OpenAI-compatible Chat Completions API: **OpenRouter, OpenAI, Anthropic, Google Gemini, Groq, Ollama (local)**, or any custom endpoint (LM Studio, vLLM, llama.cpp).
  Tools: `run_command`, `read_file`, `write_file`, `list_dir`, `remember`, `forget`.
- **Antigravity CLI (`agy`)** and **Codex CLI (`codex`)** are optional. They show up automatically when found on `PATH`, and they run their own tool loops (with their own approvals off).

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

Each OS builds its own installers, so CI builds the rest. Pushing a version tag makes GitHub Actions (`.github/workflows/release.yml`) build everything into a draft release, with a `SHA256SUMS.txt`:

```bash
git tag -s v0.3.0 -m "WillaAI v0.3.0" && git push origin v0.3.0
```

| Platform | Output |
|---|---|
| Linux | `.AppImage`, `.deb`, `.rpm` |
| Windows | `.exe` (NSIS installer), `.msi` |
| macOS | `.dmg` for Apple Silicon and Intel |

**Signing:** builds are unsigned by default, so macOS Gatekeeper and Windows SmartScreen warn on first launch. To remove the warnings, add signing certificates ([Tauri signing docs](https://tauri.app/distribute/sign/)).

## Layout

```
src/                     SolidJS UI
  components/            Message, Terminal, Settings, Sidebar
  lib/                   IPC bindings, chat store, run controller
src-tauri/src/
  agent/api.rs           OpenAI-compatible streaming tool loop (+ tests)
  agent/cli.rs           agy / codex wrappers
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

## Contributing and security

- [CONTRIBUTING.md](CONTRIBUTING.md): how to set up, test and send a pull request
- [SECURITY.md](SECURITY.md): how to report a vulnerability privately, and how WillaAI handles your keys and data
- [CHANGELOG.md](CHANGELOG.md): what changed in each release
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md): how we expect people to treat each other

## License

[MIT](LICENSE)
