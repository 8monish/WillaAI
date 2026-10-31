# RipeAI WhatsApp Remote Terminal & Agent 📱💻

Control and automate your Linux environment directly from a private WhatsApp chat using RipeAI's native local Gemini system agent (`agy`) and direct shell execution via WhatsApp Web emulation.

---

## 🌟 Key Capabilities

- **Dedicated Owner DM Control:** Restrict bot execution strictly to your personal WhatsApp number (`OWNER_PHONE_NUMBER`). Unauthorized contacts are ignored.
- **Proactive Handshake Greeting:** As soon as WhatsApp Web connects and is authenticated, the bot sends an automatic `"Hi! RipeAI is online..."` greeting directly to your WhatsApp chat!
- **Native Local AI Agent (`agy`):** Uses the exact local Gemini agent that RipeAI was built around (`gemini-3.8-flash-high`). No OpenAI API key required! The agent can execute system tools (`run_command`, `read_file`, `write_to_file`, `grep_search`, `list_dir`) directly on your machine.
- **Direct Terminal Execution:** Prefix any message with `$` or `!` (e.g. `$ uname -a` or `$ git status`) to execute directly in Linux bash and get real-time terminal output.
- **Persistent Session (`LocalAuth`):** Credentials are saved locally to `./.wweb_auth/`. You only need to scan the terminal QR code once on setup. Subsequent runs log in automatically.
- **Quick System Actions:** Built-in commands like `status` (system RAM, CPU, uptime), `pwd`, and `cd <path>`.
- **Self-chat control:** When the linked WhatsApp account is also the owner, messages sent from your phone to that account's own chat are accepted as prompts. Messages sent by the bot itself are ignored to prevent loops.

---

## 📁 Architecture

```
whatsapp-bot/
├── package.json               # Dependencies and scripts
├── .env.example               # Configuration template
├── .gitignore                 # Ignores session tokens (.wweb_auth) & node_modules
├── README.md                  # Documentation and manual
└── src/
    ├── index.js               # Application bootstrap and shutdown hooks
    ├── config/
    │   └── config.js          # Owner phone number, agy settings & Chrome detection
    ├── services/
    │   ├── system-agent.js    # Local agy child_process runner & direct bash exec
    │   ├── ai.js              # Fallback OpenAI SDK integration
    │   └── whatsapp.js        # WhatsApp client lifecycle, handshake & routing
    └── utils/
        ├── formatter.js       # WhatsApp markdown sanitizer (*bold*, bullets, no ###)
        └── logger.js          # Styled terminal logger
```

---

## 🚀 Quick Setup & Configuration

### 1. Configure `.env`

Copy `.env.example` to `.env`:

```bash
cd whatsapp-bot
cp .env.example .env
```

Open `.env` and set your personal WhatsApp number:

```env
# Your phone number with country code (digits only)
# Examples: 919876543210 (India), 15551234567 (US)
OWNER_PHONE_NUMBER=919876543210

# Automatically send a "Hi!" greeting to your WhatsApp when connected
SEND_GREETING_ON_READY=true

# Uses RipeAI's native local agent by default (no API key needed!)
AI_ENGINE=agy
AGY_MODEL=gemini-3.8-flash-high
```

*(Note: If you leave `OWNER_PHONE_NUMBER` blank, the bot will automatically pair with the very first phone number that messages it).*

---

## 🏃 Running the Service

Start the service from the `whatsapp-bot` folder:
```bash
npm start
```
*(Or from the project root using `./run-whatsapp.sh`)*

### 1. Link Your WhatsApp Account
On your first run:
1. A QR code will display in your terminal window.
2. Open **WhatsApp** on your phone > **Settings** > **Linked Devices** > **Link a Device**.
3. Scan the terminal QR code.

### 2. Automatic Handshake
Once authenticated, you will immediately receive a WhatsApp message in your chat from RipeAI:
> 👋 *Hi! RipeAI is online and connected to your Linux machine.* 💻  
> 🖥️ *Host:* `bish` (monish)  
> 📂 *Workspace:* `/home/monish/Projects/RipeAI`  
> 🤖 *AI Engine:* *Gemini 3.8 Flash (Local System Agent)*  
> 
> You can now control your system directly from this WhatsApp chat:  
> • *Ask anything:* _"What files are in this project?"_ or _"Check disk and RAM"_  
> • *Run direct bash:* Start with `$` (e.g. `$ free -h` or `$ git status`)  
> • *Quick commands:* Send `status`, `pwd`, or `help`  
> 
> Ready for your first command! 🚀

---

## 💬 Controlling Your System from WhatsApp

| What You Send in WhatsApp | What Happens on Your Machine |
| :--- | :--- |
| `status` | Returns system uptime, CPU load, RAM usage, and current folder. |
| `pwd` | Displays the current working directory. |
| `cd /path/to/folder` | Changes the working directory on your system. |
| `$ uname -a` or `! free -h` | Executes directly in Linux bash and replies with terminal stdout/stderr. |
| `Check why the build failed in this repo` | Spawns the local `agy` Gemini agent to inspect git status, read logs, and report findings. |
| `Find all python files modified today` | The local agent uses system search tools (`find`, `grep`) and returns the results. |
| `help` | Displays interactive quick reference guide. |

---

## 🛡️ Security & Privacy
- **Strict DM Whitelist:** Only messages matching `OWNER_PHONE_NUMBER` are processed. Incoming messages from unauthorized contacts or groups are ignored.
- **Local Execution:** Prompts run through local `agy` in your project workspace and don't go to third-party endpoints unless explicitly set to `AI_ENGINE=openai`.
