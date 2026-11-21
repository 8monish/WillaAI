# WillaAI

A self-hosted web dashboard for controlling a Linux machine with AI coding agents, from the browser or from WhatsApp.

WillaAI (internally called RipeAI) is a FastAPI backend with a vanilla-JS frontend. It wraps command-line AI agents, streams their output and tool calls live, and gives you a built-in terminal next to the chat.

> ⚠️ **Local, trusted use only.** The agents run with approvals and sandboxing turned off, and the terminal endpoint runs any shell command it receives. Do not expose this server to the internet.

---

## What it does

- **Agent chat with live streaming**: prompts go to an agent CLI running as a subprocess, and its responses and tool calls stream back to the UI as NDJSON.
  - **Gemini** through the Antigravity CLI (`agy`), in high, medium and low effort modes
  - **Codex** through the OpenAI Codex CLI (`codex exec`)
- **Built-in terminal**: a slide-out terminal that runs bash in the workspace, keeps track of `cd` across commands and times out after 40 seconds. Chat messages starting with `$ ` or `! ` run directly as shell commands.
- **Persistent memory**: the agent can save facts with `<remember key="…">…</remember>` tags. They're stored in `memories.json` and added to the system prompt in later sessions. You can view and manage them over REST.
- **WhatsApp remote control**: a Node.js companion service (`whatsapp-web.js`) links your WhatsApp account by QR code and accepts commands only from the owner's DM, so you can send prompts from your phone.
- **System stats**: CPU, memory and disk usage served at `/api/system/stats`.
- **Live sync**: server-sent events keep the web UI updated when prompts come in from WhatsApp.

## Architecture

```
Browser UI ─┐                        ┌─> agy (Gemini)   ─┐
            ├─> FastAPI (main.py) ───┤                   ├─> shell tools in workspace
WhatsApp ───┘   (whatsapp-bot, Node) └─> codex exec      ─┘
                     │
                     └─> NDJSON stream + SSE events back to clients
```

## Tech stack

**Backend:** Python, FastAPI, Uvicorn, httpx, asyncio subprocess streaming
**Frontend:** vanilla HTML, CSS and JS (no framework)
**WhatsApp service:** Node.js, whatsapp-web.js
**Agents:** Antigravity CLI (`agy`), OpenAI Codex CLI

## Getting started

**Requirements:** Linux, Python 3.10+, Node.js 18+, and at least one of `agy` or `codex` installed and logged in.

```bash
pip install -r requirements.txt
./run.sh                 # starts the server on http://localhost:8000
```

Optional environment variables:

| Variable | Purpose |
|---|---|
| `RIPEAI_WORKSPACE` | Folder the agents and terminal run in (defaults to the project folder) |
| `RIPEAI_PORT` | Server port (defaults to 8000) |

**WhatsApp (optional):** open **Settings → WhatsApp Remote Agent → Link WhatsApp**, scan the QR code under *Linked Devices* in the WhatsApp app, then message your own number.

## Project structure

```
main.py              FastAPI app: chat, streaming, terminal, memory, WhatsApp bridge
static/              Web UI (chat, terminal, settings, setup pages)
whatsapp-bot/        Node.js WhatsApp service
run.sh               Launcher
```

## Roadmap

- Allow-list or confirmation step for destructive shell commands
- Authentication on the HTTP API
- Container sandbox for agent execution

## License

MIT
