# RipeAI

RipeAI is a neo-brutalist agentic terminal interface for interacting with your Linux environment through locally installed models. Gemini prompts run in the project workspace and do not go to a hosted model API.

Whenever you prompt RipeAI, the selected model streams its response and tool execution in real time, and can run shell commands in the project workspace.

---

## Key Features

- **Local Gemini mode**: Send prompts to the installed Gemini model, with streamed responses and system tool execution in the project workspace.
- **GPT-6 Luna**: Switch to the locally available coding model for repo analysis and terminal task automation.
- **Embedded Interactive System Terminal**: Built-in sliding terminal drawer running native Linux bash commands (`monish@ripe:~$`) with quick action chips (`uname -a`, `free -h`, `git status`, etc.).
- **Direct Shell Prefix**: Prefix any message with `$ ` or `! ` in the chat to execute directly in bash.
- **Persistent Memory Layer**: Automatically remembers user preferences, file paths, and environment details across sessions using `<remember key="...">...</remember>` tags stored in `memories.json`.
- **WhatsApp Remote Agent**: Link your WhatsApp via QR code (`neonize`) to control your machine remotely from your phone.
- **Neo-brutalist interface**: Hard borders, offset shadows, high-contrast accent colors, and real-time streaming.

---

## Model Flow

```
User Prompt (Web UI or WhatsApp)
             │
             ▼
     RipeAI Backend (FastAPI)
             │
    ┌────────┴──────────────────┐
    ▼                           ▼
Gemini 3.8 Flash (local)  GPT-6 Luna
  • Project workspace        • Shell tool execution
  • Streaming responses      • Direct repository review
             │
             ▼
Real-Time NDJSON Streaming + Live Terminal Execution
```

---

## Quick Start

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Start RipeAI Server**:
   ```bash
   ./run.sh
   ```

3. **Open in Browser**:
   Navigate to [http://localhost:8000](http://localhost:8000). Click **"Launch RipeAI as Guest"** to immediately start issuing prompts and commands!

The **Use Gemini 3.8 Flash (High)** button in the sidebar selects that model. Prompts run in the project folder by default. Set `RIPEAI_WORKSPACE` to use a different folder, or `RIPEAI_PORT` to change the server port.

---

## WhatsApp Integration (Optional)

In RipeAI, WhatsApp connects to your local system engine:
1. Open **Models / Settings** in the web dashboard.
2. Under **WhatsApp Remote Agent**, click **Link WhatsApp**.
3. Scan the QR code with WhatsApp (Linked Devices).
4. Send a request from your phone to run tasks remotely on your machine.

---

## Security

RipeAI executes shell commands directly on your Linux environment. While Safe Mode guards against destructive patterns (like `rm -rf /`), RipeAI is designed for local, trusted use. Do not expose this server publicly without authorization or sandboxing layers.

---

## License

MIT © RipeAI
