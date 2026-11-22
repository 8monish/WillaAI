# Changelog

All notable changes to WillaAI are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.0] - 2026-11-22

A complete rewrite as a native desktop app.

### Added

- Native installers for **Windows** (`.exe`, `.msi`), **macOS** (Apple Silicon and Intel `.dmg`) and **Linux** (`.AppImage`, `.deb`, `.rpm`)
- A built-in agent in Rust that streams its replies and calls tools. It works with OpenRouter, OpenAI, Anthropic, Google Gemini, Groq, Ollama (local) and any OpenAI-compatible endpoint
- Agent tools: `run_command`, `read_file`, `write_file`, `list_dir`, `remember`, `forget`
- Optional **Antigravity CLI** (`agy`) and **Codex CLI** (`codex`) engines, detected automatically
- Approve or deny each command, or switch to full auto mode
- A Stop button that cancels a run and kills its child processes
- Multiple chats saved locally, a built-in terminal panel, long-term memory, CPU/RAM/disk stats, and light and dark themes
- `SHA256SUMS.txt` published with every release
- `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue and pull request templates, and an MIT `LICENSE` file

### Changed

- Rebuilt on **Tauri 2 + Rust + SolidJS**. The Python/FastAPI server, the vanilla-JS UI and the Node WhatsApp bot are gone, so there's no local server or open port any more
- Settings, chats and memory now live in your OS app-data folder

### Removed

- WhatsApp remote control (planned to come back as an optional add-on)

## [0.1.0]

- The original Python/FastAPI web version.

[Unreleased]: https://github.com/8monish/WillaAI/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/8monish/WillaAI/releases/tag/v0.2.0
