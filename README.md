# WillaAI 🤖

WillaAI is a neobrutalist, agentic terminal interface that enables you to interact with your Linux environment via LLM-powered command execution. It allows you to run shell commands, manage files, and store persistent memories through a sleek, high-contrast web interface or directly via WhatsApp.

## Features

- **Multi-Provider Support**: Connect via OpenRouter, OpenAI, Anthropic (Claude), Google (Gemini), Groq, or Ollama (Local).
- **Agentic Loop**: Executes shell commands via `<cmd>...</cmd>` tags with safe execution checks.
- **Persistent Memory**: Stores and retrieves facts using `<remember key="...">...</remember>` tags.
- **Neobrutalist UI**: A high-contrast, paper-white theme with bold borders and hard shadows.
- **WhatsApp Integration**: Link your personal WhatsApp via QR code (using `neonize`) to control your machine remotely.
- **File Attachments**: Support for uploading text and image files to provide context to the AI.
- **Onboarding Flow**: Smooth first-time setup for API keys and model selection.

## Tech Stack

- **Backend**: FastAPI (Python), `neonize` (WhatsApp), `segno` (QR Codes).
- **Frontend**: Vanilla HTML/CSS/JS (Neobrutalism design).
- **LLM**: Powered by OpenRouter (supports Gemini, Claude, GPT, etc.).

## Setup

1. **Install Dependencies**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Run the Server**:
   ```bash
   python3 main.py
   ```
   *The server will start at http://localhost:8000.*

3. **Configure**:
   Open the web UI and enter your OpenRouter API key in the settings.

4. **Link WhatsApp**:
   In the settings modal, click "Link WhatsApp" and scan the generated QR code.

## Environment Variables

Create a `.env` file with:
```env
OPENROUTER_API_KEY=your_key_here
```

## Security Warning

WillaAI executes shell commands. While it includes a "Safe Mode", it is intended for local use. Do **NOT** expose the web server or the WhatsApp bot to the public internet without additional security layers (like NSJail or Docker sandboxing).

## License

MIT
