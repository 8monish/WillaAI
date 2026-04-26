import os
import json
import re
import subprocess
from typing import List, Dict, Optional
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import httpx
import threading
import segno
import io
import base64
import asyncio
from neonize.client import NewClient
from neonize.events import MessageEv, ConnectedEv, QREv
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MEMORIES_FILE = "memories.json"

# Per-session CWD — simple global for single-user use
current_cwd = os.path.expanduser("~")

CONFIG_FILE = "config.json"
whatsapp_history = [] # Shared history for WhatsApp user

def load_config() -> Dict[str, str]:
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_config(cfg: Dict[str, str]):
    with open(CONFIG_FILE, "w") as f:
        json.dump(cfg, f, indent=2)

# =============================================
# MEMORY SYSTEM
# =============================================
def load_memories() -> Dict[str, str]:
    if os.path.exists(MEMORIES_FILE):
        try:
            with open(MEMORIES_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_memories(memories: Dict[str, str]):
    with open(MEMORIES_FILE, "w") as f:
        json.dump(memories, f, indent=2)

def extract_and_save_memories(text: str) -> List[Dict[str, str]]:
    """Find <remember key="...">...</remember> tags, persist them, return list of saved items."""
    saved = []
    pattern = re.compile(r'<remember\s+key=["\']([^"\']+)["\']>(.*?)</remember>', re.DOTALL)
    matches = pattern.findall(text)
    if matches:
        memories = load_memories()
        for key, value in matches:
            key = key.strip()
            value = value.strip()
            memories[key] = value
            saved.append({"key": key, "value": value})
        save_memories(memories)
    return saved

def build_memory_block() -> str:
    memories = load_memories()
    if not memories:
        return ""
    lines = ["CURRENT MEMORIES (facts you have saved about this user/system):"]
    for k, v in memories.items():
        lines.append(f"  - {k}: {v}")
    return "\n".join(lines)

def build_system_prompt() -> str:
    base = """You are WillaAI, a powerful agentic AI assistant running on a Linux system.
You can execute shell commands on the user's system to help accomplish tasks.

DYNAMIC MODE:
- You should act as a helpful chatbot for conversational queries.
- Only use the <cmd> tag if you actually need to perform a task, check system state, or run a tool.
- If the user is just chatting or asking a general question, respond as a normal AI assistant.
- Do NOT run commands for things you already know or for simple greetings.

To run a command, output it EXACTLY like this: <cmd>your command here</cmd>
Rules:
- Only one <cmd> block per response.
- After receiving the command output, continue reasoning until the task is done.
- When the task is fully complete, write your final reply to the user WITHOUT a <cmd> block.
- Be concise and safe. Do NOT run destructive commands unless explicitly asked.

MEMORY SYSTEM:
You have a persistent memory store that survives across sessions. Use it proactively.
To save something: <remember key="descriptive_key">value</remember>
- Save user name, preferred directories, project paths, preferences, editor choice, etc.
- You can include multiple <remember> blocks in any response.
- Read your memories before answering — they tell you what you already know about this user.
"""
    memory_block = build_memory_block()
    if memory_block:
        base += f"\n{memory_block}\n"
    return base

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    api_key: str
    model: str
    provider: str = "openrouter"

PROVIDER_ENDPOINTS = {
    "openrouter": "https://openrouter.ai/api/v1/chat/completions",
    "openai": "https://api.openai.com/v1/chat/completions",
    "anthropic": "https://api.anthropic.com/v1/messages",
    "groq": "https://api.groq.com/openai/v1/chat/completions",
    "ollama": "http://localhost:11434/v1/chat/completions",
    "google": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
}

async def call_llm_provider(messages: List[Dict[str, str]], api_key: str, model: str, provider: str = "openrouter") -> str:
    if not api_key or not api_key.strip():
        raise ValueError("No API key/endpoint provided. Please configure it in Settings.")

    endpoint = PROVIDER_ENDPOINTS.get(provider, PROVIDER_ENDPOINTS["openrouter"])
    
    if provider == "google":
        # Google OpenAI shim usually prefers key in URL or Bearer
        endpoint = f"{endpoint}?key={api_key.strip()}"
        # Strip google/ prefix if it came from OpenRouter list
        if model.startswith("google/"):
            model = model.replace("google/", "")
        # Map specific common versions
        model_map = {
            "gemini-flash-1.5": "gemini-1.5-flash",
            "gemini-pro-1.5": "gemini-1.5-pro",
            "gemini-flash-1.5-8b": "gemini-1.5-flash-8b"
        }
        model = model_map.get(model, model)

    if provider == "ollama" and api_key.startswith("http"):
        endpoint = f"{api_key.rstrip('/')}/v1/chat/completions"

    headers = {
        "Content-Type": "application/json",
    }

    if provider == "openrouter":
        headers["Authorization"] = f"Bearer {api_key.strip()}"
        headers["HTTP-Referer"] = "http://localhost:8000"
        headers["X-Title"] = "WillaAI"
    elif provider == "anthropic":
        headers["x-api-key"] = api_key.strip()
        headers["anthropic-version"] = "2023-06-01"
    else:
        # OpenAI, Groq, Ollama
        headers["Authorization"] = f"Bearer {api_key.strip()}"

    # Handle payload differences (Anthropic)
    if provider == "anthropic":
        payload = {
            "model": model,
            "max_tokens": 4096,
            "system": build_system_prompt(),
            "messages": messages,
        }
    else:
        payload = {
            "model": model,
            "messages": [{"role": "system", "content": build_system_prompt()}] + messages,
        }

    async with httpx.AsyncClient(timeout=90.0) as client:
        try:
            response = await client.post(endpoint, headers=headers, json=payload)
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            body = {}
            try: body = e.response.json()
            except Exception: pass
            err_msg = body.get("error", {}).get("message", str(e))
            raise ValueError(f"{provider.capitalize()} API error: {err_msg}")
        except Exception as e:
            raise ValueError(f"Request failed: {str(e)}")

    data = response.json()
    if provider == "anthropic":
        return data["content"][0]["text"]
    return data["choices"][0]["message"]["content"]


def execute_command(command: str) -> str:
    global current_cwd
    try:
        if command.strip().startswith("cd "):
            target_dir = command.strip()[3:].strip()
            target_dir = os.path.expanduser(target_dir)
            if not os.path.isabs(target_dir):
                target_dir = os.path.join(current_cwd, target_dir)
            target_dir = os.path.normpath(target_dir)
            if os.path.isdir(target_dir):
                current_cwd = target_dir
                return f"Changed directory to: {current_cwd}"
            else:
                return f"Error: Directory not found: {target_dir}"

        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            cwd=current_cwd,
            timeout=30,
        )
        output = result.stdout
        if result.stderr:
            output += f"\nSTDERR:\n{result.stderr}"
        if not output.strip():
            output = "(Command ran successfully — no output.)"
        return output
    except subprocess.TimeoutExpired:
        return "Error: Command timed out after 30 seconds."
    except Exception as e:
        return f"Error executing command: {str(e)}"


@app.get("/", response_class=HTMLResponse)
async def read_index():
    with open("static/index.html") as f:
        return f.read()


@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    if not req.api_key or not req.api_key.strip():
        raise HTTPException(status_code=400, detail="API key is required. Please configure it in Settings.")
    if not req.model or not req.model.strip():
        raise HTTPException(status_code=400, detail="Model is required. Please select one in Settings.")

    async def generate():
        messages = req.messages.copy()
        max_iterations = 12
        iteration = 0

        while iteration < max_iterations:
            iteration += 1
            yield json.dumps({"type": "status", "message": "Thinking..."}) + "\n"

            try:
                response_text = await call_llm_provider(messages, req.api_key, req.model, req.provider)
            except ValueError as e:
                yield json.dumps({"type": "error", "message": str(e)}) + "\n"
                return
            except Exception as e:
                yield json.dumps({"type": "error", "message": f"Unexpected error: {str(e)})"}) + "\n"
                return

            messages.append({"role": "assistant", "content": response_text})

            # Extract and persist any <remember> tags from the LLM response
            saved_memories = extract_and_save_memories(response_text)
            if saved_memories:
                yield json.dumps({"type": "memories_saved", "memories": saved_memories}) + "\n"

            # Strip <remember> tags from visible text
            visible_text = re.sub(r'<remember[^>]*>.*?</remember>', '', response_text, flags=re.DOTALL).strip()

            cmd_match = re.search(r"<cmd>(.*?)</cmd>", visible_text, re.DOTALL)

            if cmd_match:
                command = cmd_match.group(1).strip()
                yield json.dumps({"type": "action", "command": command}) + "\n"
                output = execute_command(command)
                yield json.dumps({"type": "action_result", "output": output}) + "\n"
                messages.append({"role": "user", "content": f"Command Output:\n{output}"})
            else:
                yield json.dumps({"type": "final", "content": visible_text}) + "\n"
                return

        yield json.dumps({"type": "error", "message": "Max agent iterations reached without a final answer."}) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")


# =============================================
# MEMORY API ENDPOINTS
# =============================================
@app.get("/api/memories")
async def get_memories():
    return JSONResponse(load_memories())


class MemoryItem(BaseModel):
    key: str
    value: str

@app.post("/api/memories")
async def add_memory(item: MemoryItem):
    memories = load_memories()
    memories[item.key.strip()] = item.value.strip()
    save_memories(memories)
    return JSONResponse({"status": "ok", "key": item.key, "value": item.value})


@app.delete("/api/memories/{key}")
async def delete_memory(key: str):
    memories = load_memories()
    if key not in memories:
        raise HTTPException(status_code=404, detail=f"Memory key '{key}' not found.")
    del memories[key]
    save_memories(memories)
    return JSONResponse({"status": "deleted", "key": key})


@app.delete("/api/memories")
async def clear_memories():
    save_memories({})
    return JSONResponse({"status": "cleared"})





# =============================================
# WHATSAPP INTEGRATION (NEONIZE)
# =============================================
wa_client = None
wa_status = "disconnected"
wa_qr_base64 = ""
whatsapp_history = []

async def wa_agent_loop(chat, original_message, text: str):
    global whatsapp_history
    cfg = load_config()
    api_key = cfg.get("action_ai_key", "")
    model = cfg.get("action_ai_model_id", "openrouter/auto")
    provider = cfg.get("action_ai_provider", "openrouter")

    if not api_key:
        wa_client.reply_message(chat, "⚠ WillaAI is not configured. Set your OpenRouter API key in the web interface first.", original_message)
        return

    if text.strip().lower() in ["clear", "reset"]:
        whatsapp_history = []
        wa_client.reply_message(chat, "🧹 Chat history cleared.", original_message)
        return

    wa_client.reply_message(chat, "⚡ Thinking...", original_message)
    whatsapp_history.append({"role": "user", "content": text})

    max_iterations = 12
    iteration = 0
    messages = whatsapp_history.copy()

    while iteration < max_iterations:
        iteration += 1
        try:
            response_text = await call_llm_provider(messages, api_key, model, provider)
        except Exception as e:
            wa_client.reply_message(chat, f"⚠ Error: {str(e)}", original_message)
            return

        messages.append({"role": "assistant", "content": response_text})
        
        extract_and_save_memories(response_text)
        visible_text = re.sub(r'<remember[^>]*>.*?</remember>', '', response_text, flags=re.DOTALL).strip()

        cmd_match = re.search(r"<cmd>(.*?)</cmd>", visible_text, re.DOTALL)
        if cmd_match:
            command = cmd_match.group(1).strip()
            wa_client.reply_message(chat, f"🛠 Running:\n{command}", original_message)
            output = execute_command(command)
            messages.append({"role": "user", "content": f"Command Output:\n{output}"})
        else:
            if visible_text:
                wa_client.reply_message(chat, visible_text, original_message)
                whatsapp_history.append({"role": "assistant", "content": visible_text})
            return
    wa_client.reply_message(chat, "⚠ Max agent iterations reached.", original_message)


def start_whatsapp_bot():
    global wa_client, wa_status, wa_qr_base64
    if wa_client is not None:
        return
    wa_status = "starting"
    wa_client = NewClient("action_ai_whatsapp.sqlite3")

    @wa_client.event(ConnectedEv)
    def on_connected(_: NewClient, __: ConnectedEv):
        global wa_status
        print("DEBUG: WhatsApp ConnectedEv fired!", flush=True)
        wa_status = "connected"
        print("✅ WhatsApp Linked Successfully!", flush=True)

    @wa_client.event(QREv)
    def on_qr(_: NewClient, event: QREv):
        global wa_status, wa_qr_base64
        print("DEBUG: on_qr triggered!", flush=True)
        codes = list(event.Codes)
        if not codes:
            print("DEBUG: WhatsApp QREv fired but Codes list is empty!", flush=True)
            return
        print(f"DEBUG: WhatsApp QREv fired! Codes: {len(codes)}", flush=True)
        wa_status = "qr"
        qr = segno.make(codes[0])
        out = io.BytesIO()
        qr.save(out, kind="png", scale=5)
        wa_qr_base64 = base64.b64encode(out.getvalue()).decode()
        print("DEBUG: QR Code generated and saved to wa_qr_base64", flush=True)

    @wa_client.event(MessageEv)
    def on_message(client: NewClient, message: MessageEv):
        chat = message.Info.MessageSource.Chat
        text = message.Message.conversation
        extended_text = message.Message.extendedTextMessage.text
        body = text or extended_text
        if not body:
            return
        
        # Run async agent loop in a new event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(wa_agent_loop(chat, message, body))
        loop.close()

    try:
        wa_client.connect()
    except Exception as e:
        print(f"WhatsApp Error: {e}")
        wa_status = "error"


@app.post("/api/whatsapp/start")
async def api_wa_start():
    if wa_status == "disconnected" or wa_status == "error":
        threading.Thread(target=start_whatsapp_bot, daemon=True).start()
    return JSONResponse({"status": "starting"})

@app.get("/api/whatsapp/status")
async def api_wa_status():
    return JSONResponse({
        "status": wa_status,
        "qr_base64": wa_qr_base64 if wa_status == "qr" else ""
    })

# Auto-start if session file exists
if os.path.exists("action_ai_whatsapp.sqlite3"):
    threading.Thread(target=start_whatsapp_bot, daemon=True).start()


# =============================================
# CONFIG API ENDPOINTS (For WhatsApp Bot Sync)
# =============================================
class ConfigPayload(BaseModel):
    action_ai_key: str
    action_ai_model_id: str
    action_ai_provider: str = "openrouter"

@app.post("/api/config")
async def update_config(cfg: ConfigPayload):
    save_config(cfg.dict())
    return JSONResponse({"status": "ok"})

@app.get("/api/config")
async def get_config():
    # Only return existence of keys so UI knows they exist
    cfg = load_config()
    return JSONResponse({
        "has_api_key": bool(cfg.get("action_ai_key")),
        "model_id": cfg.get("action_ai_model_id", ""),
        "provider": cfg.get("action_ai_provider", "openrouter")
    })
