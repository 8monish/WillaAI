# WillaAI 🤖

WillaAI is a neobrutalist, agentic terminal interface that enables you to interact with your Linux environment via LLM-powered command execution. It allows you to run shell commands, manage files, and store persistent memories through a sleek, high-contrast web interface or directly via WhatsApp.

## Features

- **Google Sign-In & Auth**: Built-in Google OAuth 2.0 authentication with Google Identity Services (GIS), session persistence, user profile avatar in sidebar, and Guest mode support.
- **Multi-Provider Support**: Connect via OpenRouter, OpenAI, Anthropic (Claude), Google (Gemini), Groq, or Ollama (Local).
- **Agentic Loop**: Executes shell commands via `<cmd>...</cmd>` tags with safe execution checks.
- **Persistent Memory**: Stores and retrieves facts using `<remember key="...">...</remember>` tags.
- **Neobrutalist UI**: A high-contrast, paper-white theme with bold borders and hard shadows.
- **WhatsApp Integration**: Link your personal WhatsApp via QR code (using `neonize`) to control your machine remotely.
- **File Attachments**: Support for uploading text and image files to provide context to the AI.
- **Onboarding Flow**: Smooth first-time setup for API keys and model selection.

## Tech Stack

- **Backend**: FastAPI (Python), `httpx`, `segno` (QR Codes), `neonize` (WhatsApp).
- **Frontend**: Vanilla HTML/CSS/JS (Neobrutalism design), Google Identity Services.
- **LLM**: Powered by OpenRouter, OpenAI, Anthropic, Google Gemini, Groq, Ollama.

## Setup

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Google OAuth Setup (Optional for Google Sign-In)**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/) -> **APIs & Services** -> **Credentials**.
   - Create an **OAuth 2.0 Client ID** (Web application) with Authorized JavaScript Origin: `http://localhost:8000`.
   - Add your Client ID to `.env`:
     ```env
     GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
     ```
   *(You can also use the built-in Guest / Demo mode at any time!)*

3. **Run the Server**:
   ```bash
   uvicorn main:app --port 8000
   ```
   *The server will start at http://localhost:8000.*

4. **Configure**:
   Open the web UI, sign in with Google or as a Guest, and enter your AI API key in the settings/onboarding.

5. **Link WhatsApp**:
   In the settings modal, click "Link WhatsApp" and scan the generated QR code.

## Environment Variables

Create a `.env` file with:
```env
OPENROUTER_API_KEY=your_key_here
GOOGLE_CLIENT_ID=your_google_client_id_here
```

## Security Warning

WillaAI executes shell commands. While it includes a "Safe Mode", it is intended for local use. Do **NOT** expose the web server or the WhatsApp bot to the public internet without additional security layers (like NSJail or Docker sandboxing).

## License

MIT

