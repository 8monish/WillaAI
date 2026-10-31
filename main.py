import os
import json
import re
import shutil
import asyncio
import subprocess
from typing import List, Dict, Optional, Set
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import httpx
import threading
import segno
import io
import base64
import socket
import platform

# WhatsApp is integrated via Node.js whatsapp-web.js bridge service

from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="RipeAI", description="Agentic system terminal for your local workspace")
app.mount("/static", StaticFiles(directory="static"), name="static")

MEMORIES_FILE = "memories.json"
CONFIG_FILE = "config.json"
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
current_cwd = os.path.abspath(os.path.expanduser(os.getenv("RIPEAI_WORKSPACE", PROJECT_DIR)))
whatsapp_history = []
chat_event_queues: Set[asyncio.Queue] = set()
pending_whatsapp_prompts: Dict[str, asyncio.Future] = {}

def load_config() -> Dict[str, str]:
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_config(cfg: Dict[str, str]):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)

def load_memories() -> Dict[str, str]:
    if os.path.exists(MEMORIES_FILE):
        try:
            with open(MEMORIES_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_memories(memories: Dict[str, str]):
    with open(MEMORIES_FILE, "w", encoding="utf-8") as f:
        json.dump(memories, f, indent=2)

def extract_and_save_memories(text: str) -> List[Dict[str, str]]:
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
    base = """You are RipeAI — an intelligent Linux system agent powered by locally available models and system tools.

=== OPERATIONAL PHILOSOPHY ===
You bridge natural human language and low-level Linux terminal execution.
You can answer technical questions, explain architecture, or execute terminal commands to inspect, manage, and automate the user's Linux system.

=== HOW TO DECIDE WHAT TO DO ===
1. CONVERSATION / EXPLANATION:
   If the user is asking questions, chatting, or wanting knowledge, respond with concise, accurate markdown.

2. COMMAND EXECUTION:
   When the user asks you to inspect, manage, check, list, install, run, or configure anything on their machine, output the command formatted as:
   <cmd>command here</cmd>
   Output ONE command at a time. The system executes it and returns stdout/stderr.

3. PERSISTENT MEMORY:
   Save important facts across sessions using:
   <remember key="key_name">fact value</remember>
"""
    memory_block = build_memory_block()
    if memory_block:
        base += f"\n{memory_block}\n"
    return base

def build_cli_prompt(messages: List[Dict[str, str]]) -> str:
    if not messages:
        return ""
    if len(messages) == 1:
        return messages[-1].get("content", "")

    recent = messages[-6:]
    parts = []
    for msg in recent[:-1]:
        role = "User" if msg.get("role") == "user" else "Assistant"
        parts.append(f"[{role}]: {msg.get('content', '')}")
    
    last_user = recent[-1].get("content", "")
    context_str = "\n".join(parts)
    return f"Previous conversation context:\n{context_str}\n\n[User's latest request]:\n{last_user}"

def execute_command(command: str) -> str:
    global current_cwd
    try:
        cmd_stripped = command.strip()
        if cmd_stripped.startswith("cd "):
            target_dir = cmd_stripped[3:].strip()
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
            timeout=40,
        )
        output = result.stdout
        if result.stderr:
            output += f"\nSTDERR:\n{result.stderr}"
        if not output.strip():
            output = "(Command ran successfully — no output.)"
        return output
    except subprocess.TimeoutExpired:
        return "Error: Command timed out after 40 seconds."
    except Exception as e:
        return f"Error executing command: {str(e)}"

# ==========================================
# Local model streaming
# ==========================================

async def run_gemini_stream(prompt: str, model: str = "gemini-3.8-flash-high"):
    model_map = {
        "gemini": "gemini-3.8-flash-high",
        "gemini-flash": "gemini-3.8-flash-high",
        "gemini-3.8-flash": "gemini-3.8-flash-high",
        "gemini-flash-1.5": "gemini-3.8-flash-high",
        "claude": "claude-sonnet-4-6",
        "claude-sonnet": "claude-sonnet-4-6",
        "gpt": "gpt-oss-120b-medium",
        "auto": "gemini-3.8-flash-high"
    }
    actual_model = model_map.get(model, model) or "gemini-3.8-flash-high"

    cmd = ["agy", "--model", actual_model, "--dangerously-skip-permissions", "--output-format", "stream-json", "-p", prompt]
    
    model_names = {
        "gemini-3.8-flash-high": "Gemini 3.8 Flash (High)",
        "gemini-3.8-flash-medium": "Gemini 3.8 Flash (Medium)",
        "gemini-3.8-flash-low": "Gemini 3.8 Flash (Low)",
        "claude-sonnet-4-6": "Claude Sonnet 4.6",
        "gpt-oss-120b-medium": "GPT-OSS 120B",
    }
    display_model = model_names.get(actual_model, actual_model)
    yield json.dumps({"type": "status", "message": f"Running {display_model}..."}) + "\n"

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=current_cwd
        )
    except Exception as e:
        yield json.dumps({"type": "error", "message": "The selected model could not start. Check that it is available in this environment."}) + "\n"
        return

    full_response = ""
    streamed_any = False

    while True:
        line_bytes = await proc.stdout.readline()
        if not line_bytes:
            break
        line = line_bytes.decode("utf-8", errors="replace").strip()
        if not line:
            continue
        try:
            data = json.loads(line)
            event = data.get("event")
            if event == "step_update":
                su = data.get("step_update", {})
                st = su.get("step_type")
                if st == "agent_response":
                    delta = su.get("text_delta")
                    if delta:
                        full_response += delta
                        streamed_any = True
                        yield json.dumps({"type": "delta", "content": delta}) + "\n"
                elif st == "tool":
                    state = su.get("state")
                    tool_name = su.get("tool_name", "command")
                    tool_info = su.get("tool_info", {})
                    if state == "ACTIVE":
                        cmd_param = tool_info.get("parameters", {}).get("CommandLine") or tool_name
                        yield json.dumps({"type": "action", "command": cmd_param, "tool": tool_name}) + "\n"
                    elif state == "DONE":
                        out = tool_info.get("output", "")
                        yield json.dumps({"type": "action_result", "output": out}) + "\n"
            elif event == "result":
                res = data.get("result", {})
                resp_text = res.get("response", "")
                if resp_text and not full_response:
                    full_response = resp_text
        except Exception:
            pass

    await proc.wait()

    if not full_response:
        err_bytes = await proc.stderr.read()
        err_text = err_bytes.decode("utf-8", errors="replace").strip()
        if err_text:
            yield json.dumps({"type": "error", "message": "The selected model stopped with an error. Check the server logs for details."}) + "\n"
            return
        full_response = "Task completed."

    # Extract memories
    memories = extract_and_save_memories(full_response)
    if memories:
        yield json.dumps({"type": "memories_saved", "memories": memories}) + "\n"

    # Handle plain command tags when the model did not execute a tool directly.
    cmd_match = re.search(r"<cmd>(.*?)</cmd>", full_response, re.DOTALL)
    if cmd_match and not streamed_any:
        command = cmd_match.group(1).strip()
        yield json.dumps({"type": "action", "command": command}) + "\n"
        output = execute_command(command)
        yield json.dumps({"type": "action_result", "output": output}) + "\n"

    yield json.dumps({"type": "final", "content": full_response}) + "\n"


async def run_codex_stream(prompt: str):
    yield json.dumps({"type": "status", "message": "Running GPT-6 Luna..."}) + "\n"

    cmd = [
        "codex", "exec",
        "--dangerously-bypass-approvals-and-sandbox",
        "--skip-git-repo-check",
        "--color", "never",
        prompt
    ]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=current_cwd
        )
    except Exception as e:
        yield json.dumps({"type": "error", "message": "GPT-6 Luna could not start. Check that it is available in this environment."}) + "\n"
        return

    full_output = []
    codex_lines = []
    capture = False

    while True:
        line_bytes = await proc.stdout.readline()
        if not line_bytes:
            break
        line = line_bytes.decode("utf-8", errors="replace")
        full_output.append(line)
        stripped = line.strip()

        if stripped.startswith("exec"):
            yield json.dumps({"type": "action", "command": stripped}) + "\n"
        elif "succeeded in" in stripped or "failed in" in stripped:
            yield json.dumps({"type": "action_result", "output": stripped}) + "\n"
        elif stripped == "codex":
            capture = True
            continue
        elif stripped.startswith("tokens used"):
            capture = False
            continue

        if capture:
            codex_lines.append(line)
            yield json.dumps({"type": "delta", "content": line}) + "\n"

    await proc.wait()
    final_text = "".join(codex_lines).strip()
    if not final_text:
        final_text = "".join(full_output).strip()

    extract_and_save_memories(final_text)
    yield json.dumps({"type": "final", "content": final_text}) + "\n"


# ==========================================
# FASTAPI ENDPOINTS
# ==========================================

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    api_key: Optional[str] = ""
    model: Optional[str] = "gemini-3.8-flash-high"
    provider: Optional[str] = "antigravity"
    engine: Optional[str] = "antigravity"

def get_system_stats() -> Dict:
    mem_total_mb = 0
    mem_avail_mb = 0
    if os.path.exists("/proc/meminfo"):
        try:
            with open("/proc/meminfo", "r") as f:
                lines = f.readlines()
            for line in lines:
                if line.startswith("MemTotal:"):
                    mem_total_mb = int(line.split()[1]) // 1024
                elif line.startswith("MemAvailable:"):
                    mem_avail_mb = int(line.split()[1]) // 1024
        except Exception:
            pass
    mem_used_mb = max(0, mem_total_mb - mem_avail_mb)
    mem_pct = round((mem_used_mb / mem_total_mb * 100), 1) if mem_total_mb else 0

    disk = shutil.disk_usage(current_cwd)
    disk_total_gb = round(disk.total / (1024**3), 1)
    disk_used_gb = round(disk.used / (1024**3), 1)
    disk_free_gb = round(disk.free / (1024**3), 1)
    disk_pct = round((disk.used / disk.total * 100), 1) if disk.total else 0

    uptime_str = "Active"
    if os.path.exists("/proc/uptime"):
        try:
            with open("/proc/uptime", "r") as f:
                secs = float(f.readline().split()[0])
            hours = int(secs // 3600)
            mins = int((secs % 3600) // 60)
            uptime_str = f"{hours}h {mins}m"
        except Exception:
            pass

    user = os.getenv("USER") or "monish"
    hostname = socket.gethostname()

    return {
        "hostname": hostname,
        "user": user,
        "os": f"{platform.system()} {platform.release()}",
        "arch": platform.machine(),
        "cpu_count": os.cpu_count() or 1,
        "uptime": uptime_str,
        "cwd": current_cwd,
        "memory": {
            "total_mb": mem_total_mb,
            "used_mb": mem_used_mb,
            "free_mb": mem_avail_mb,
            "percent": mem_pct
        },
        "disk": {
            "total_gb": disk_total_gb,
            "used_gb": disk_used_gb,
            "free_gb": disk_free_gb,
            "percent": disk_pct
        }
    }

@app.get("/", response_class=HTMLResponse)
async def read_index():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()

@app.get("/whatsapp", response_class=HTMLResponse)
async def read_whatsapp_page():
    path = "static/whatsapp.html"
    if not os.path.exists(path):
        path = "static/index.html"
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

@app.get("/setup", response_class=HTMLResponse)
@app.get("/whatsapp/setup", response_class=HTMLResponse)
async def read_setup_page():
    path = "static/setup.html"
    if not os.path.exists(path):
        path = "static/index.html"
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

@app.get("/terminal", response_class=HTMLResponse)
async def read_terminal_page():
    path = "static/terminal.html"
    if not os.path.exists(path):
        path = "static/index.html"
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

@app.get("/settings", response_class=HTMLResponse)
async def read_settings_page():
    path = "static/settings.html"
    if not os.path.exists(path):
        path = "static/index.html"
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

@app.get("/api/system/stats")
async def api_system_stats():
    return JSONResponse(get_system_stats())

@app.get("/api/model/status")
async def get_cli_status():
    has_gemini_model = bool(shutil.which("agy"))
    has_codex = bool(shutil.which("codex"))
    has_gemini = bool(shutil.which("gemini"))
    has_claude = bool(shutil.which("claude"))

    return JSONResponse({
        "project": "RipeAI",
        "engines": {
            "primary_model": {
                "available": has_gemini_model,
                "name": "Gemini 3.8 Flash (High)",
                "models": [
                    {"id": "gemini-3.8-flash-high", "name": "Gemini 3.8 Flash (High)", "tag": "RECOMMENDED"},
                    {"id": "gemini-3.8-flash-medium", "name": "Gemini 3.8 Flash (Medium)", "tag": "BALANCED"},
                    {"id": "gemini-3.8-flash-low", "name": "Gemini 3.8 Flash (Low)", "tag": "FAST"},
                    {"id": "claude-sonnet-4-6", "name": "Claude Sonnet 4.6 (Thinking)", "tag": "REASON"},
                    {"id": "gpt-oss-120b-medium", "name": "GPT-OSS 120B (Medium)", "tag": "OPEN"},
                ]
            },
            "codex": {
                "available": has_codex,
                "name": "GPT-6 Luna",
                "path": shutil.which("codex") or "",
                "models": [
                    {"id": "gpt-6-luna", "name": "Codex Default (gpt-6-luna)", "tag": "CODEX"}
                ]
            },
            "gemini": {
                "available": has_gemini,
                "name": "Gemini (optional)",
                "path": shutil.which("gemini") or "",
            },
            "claude": {
                "available": has_claude,
                "name": "Claude Code",
                "path": shutil.which("claude") or "",
            }
        },
        "default_engine": "gemini-3.8-flash-high",
        "default_model": "gemini-3.8-flash-high",
        "current_cwd": current_cwd,
        "no_api_key_required": True
    })

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    if not req.messages:
        raise HTTPException(status_code=400, detail="Messages array cannot be empty.")

    engine = (req.engine or req.provider or "antigravity").lower()
    last_msg = req.messages[-1].get("content", "").strip()

    # If user explicitly starts with $ or ! run directly in terminal
    if last_msg.startswith("$ ") or last_msg.startswith("! "):
        raw_cmd = last_msg[2:].strip()
        async def run_direct():
            yield json.dumps({"type": "action", "command": raw_cmd}) + "\n"
            out = execute_command(raw_cmd)
            yield json.dumps({"type": "action_result", "output": out}) + "\n"
            yield json.dumps({"type": "final", "content": f"Executed:\n```bash\n{out}\n```"}) + "\n"
        return StreamingResponse(run_direct(), media_type="application/x-ndjson")

    prompt = build_cli_prompt(req.messages)

    if engine in ["codex"]:
        return StreamingResponse(run_codex_stream(prompt), media_type="application/x-ndjson")
    elif engine in ["bash", "terminal"]:
        async def run_shell_mode():
            yield json.dumps({"type": "action", "command": last_msg}) + "\n"
            out = execute_command(last_msg)
            yield json.dumps({"type": "action_result", "output": out}) + "\n"
            yield json.dumps({"type": "final", "content": out}) + "\n"
        return StreamingResponse(run_shell_mode(), media_type="application/x-ndjson")
    else:
        # Default local model
        selected_model = req.model or "gemini-3.8-flash-high"
        return StreamingResponse(run_gemini_stream(prompt, selected_model), media_type="application/x-ndjson")


class TerminalExecRequest(BaseModel):
    command: str

@app.post("/api/terminal/exec")
async def terminal_exec(req: TerminalExecRequest):
    global current_cwd
    cmd = req.command.strip()
    if not cmd:
        return JSONResponse({"output": "", "cwd": current_cwd, "code": 0})
    
    if cmd.startswith("cd "):
        target = os.path.expanduser(cmd[3:].strip())
        if not os.path.isabs(target):
            target = os.path.normpath(os.path.join(current_cwd, target))
        if os.path.isdir(target):
            current_cwd = target
            return JSONResponse({"output": f"Directory changed to: {current_cwd}", "cwd": current_cwd, "code": 0})
        else:
            return JSONResponse({"output": f"cd: no such directory: {target}", "cwd": current_cwd, "code": 1})

    try:
        proc = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            cwd=current_cwd,
            timeout=45
        )
        out = proc.stdout
        if proc.stderr:
            out = (out + "\n" + proc.stderr).strip()
        return JSONResponse({
            "output": out if out else "(Command completed with no output)",
            "cwd": current_cwd,
            "code": proc.returncode
        })
    except subprocess.TimeoutExpired:
        return JSONResponse({"output": "Command timed out after 45 seconds.", "cwd": current_cwd, "code": 124})
    except Exception as e:
        return JSONResponse({"output": f"Execution error: {str(e)}", "cwd": current_cwd, "code": 1})


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


# ==========================================
# WhatsApp integration (Node.js whatsapp-bot service bridge)
# ==========================================

WA_BRIDGE_URL = "http://127.0.0.1:8008"
wa_process = None

def ensure_whatsapp_service_running():
    global wa_process
    try:
        if wa_process and wa_process.poll() is None:
            return True
    except Exception:
        pass

    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.15)
        res = s.connect_ex(('127.0.0.1', 8008))
        s.close()
        if res == 0:
            return True
    except Exception:
        pass

    bot_dir = os.path.join(PROJECT_DIR, "whatsapp-bot")
    if os.path.isdir(bot_dir):
        log_file = open(os.path.join(PROJECT_DIR, "whatsapp-bot.log"), "a", encoding="utf-8")
        wa_process = subprocess.Popen(
            ["node", "src/index.js"],
            cwd=bot_dir,
            stdout=log_file,
            stderr=log_file
        )
    return True

class WhatsAppStartPayload(BaseModel):
    owner_number: Optional[str] = ""

@app.get("/api/whatsapp/status")
async def api_wa_status():
    ensure_whatsapp_service_running()
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{WA_BRIDGE_URL}/api/whatsapp/status")
            if resp.status_code == 200:
                return JSONResponse(resp.json())
    except Exception:
        pass
    return JSONResponse({"status": "starting", "qr_base64": "", "owner_number": ""})

@app.post("/api/whatsapp/start")
async def api_wa_start(payload: Optional[WhatsAppStartPayload] = None):
    ensure_whatsapp_service_running()
    data = {}
    if payload and payload.owner_number:
        data["owner_number"] = payload.owner_number
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.post(f"{WA_BRIDGE_URL}/api/whatsapp/start", json=data)
            if resp.status_code == 200:
                return JSONResponse(resp.json())
    except Exception:
        pass
    return JSONResponse({"status": "starting", "owner_number": data.get("owner_number", "")})

@app.post("/api/whatsapp/ping")
async def api_wa_ping():
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.post(f"{WA_BRIDGE_URL}/api/whatsapp/ping")
            return JSONResponse(resp.json(), status_code=resp.status_code)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

@app.post("/api/whatsapp/disconnect")
async def api_wa_disconnect():
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.post(f"{WA_BRIDGE_URL}/api/whatsapp/disconnect")
            if resp.status_code == 200:
                return JSONResponse(resp.json())
    except Exception:
        pass
    return JSONResponse({"status": "disconnected"})

class WhatsAppNotifyPayload(BaseModel):
    message: str

@app.post("/api/whatsapp/notify-owner")
async def api_wa_notify_owner(payload: WhatsAppNotifyPayload):
    if not payload.message:
        return JSONResponse({"success": False, "reason": "Empty message"})
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.post(f"{WA_BRIDGE_URL}/api/whatsapp/send-to-owner", json={"message": payload.message})
            if resp.status_code == 200:
                return JSONResponse(resp.json())
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    return JSONResponse({"success": False, "reason": "Failed to contact WhatsApp bridge"})

# ==========================================
# Real-Time Main Page SSE Event Stream & Remote Prompt Execution
# ==========================================

conversation_history: List[Dict] = []

def add_to_conversation_history(role: str, content: str, from_whatsapp: bool = False, sender: str = ""):
    item = {
        "role": role,
        "content": content,
        "from_whatsapp": from_whatsapp,
        "sender": sender,
    }
    conversation_history.append(item)
    if len(conversation_history) > 60:
        conversation_history.pop(0)
    return item

@app.get("/api/chat/history")
async def get_chat_history():
    return JSONResponse(conversation_history)

async def broadcast_event(data: dict):
    if not chat_event_queues:
        return
    for q in list(chat_event_queues):
        try:
            await q.put(data)
        except Exception:
            pass

@app.get("/api/chat/events")
async def chat_events_stream(request: Request):
    queue = asyncio.Queue()
    chat_event_queues.add(queue)

    async def event_generator():
        try:
            yield f"data: {json.dumps({'type': 'connected'})}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    msg = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {json.dumps(msg)}\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            chat_event_queues.discard(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )

class WhatsAppPromptPayload(BaseModel):
    sender: str
    prompt: str
    message_id: str

@app.post("/api/whatsapp/incoming-prompt")
async def handle_whatsapp_incoming_prompt(req: WhatsAppPromptPayload):
    prompt_text = req.prompt.strip()
    sender_number = req.sender

    # 1. Add user message to conversation history
    add_to_conversation_history(
        role="user",
        content=prompt_text,
        from_whatsapp=True,
        sender=sender_number
    )

    # 2. Immediately broadcast user prompt to all active browser windows
    await broadcast_event({
        "type": "user_message",
        "content": prompt_text,
        "from_whatsapp": True,
        "sender": sender_number,
        "id": req.message_id
    })

    # 3. Execute prompt and live-stream output events to browser
    final_output = ""
    try:
        if prompt_text.startswith("$ ") or prompt_text.startswith("! "):
            cmd = prompt_text[2:].strip()
            await broadcast_event({"type": "action", "command": cmd, "tool": "bash"})
            out = execute_command(cmd)
            await broadcast_event({"type": "action_result", "output": out})
            final_output = f"Executed:\n```bash\n{out}\n```"
            await broadcast_event({"type": "final", "content": final_output})
        else:
            cfg = load_config()
            model_id = cfg.get("action_ai_model_id", "gemini-3.8-flash-high")
            async for chunk in run_gemini_stream(prompt_text, model_id):
                try:
                    parsed = json.loads(chunk.strip())
                    await broadcast_event(parsed)
                    if parsed.get("type") == "final":
                        final_output = parsed.get("content", "")
                    elif parsed.get("type") == "delta":
                        final_output += parsed.get("content", "")
                except Exception:
                    pass

        if not final_output:
            final_output = "Task completed."

        # Add assistant response to history
        add_to_conversation_history(
            role="assistant",
            content=final_output,
            from_whatsapp=True,
            sender="RipeAI"
        )

        return JSONResponse({"status": "success", "response": final_output})
    except Exception as e:
        err_msg = f"Error executing prompt: {str(e)}"
        await broadcast_event({"type": "error", "message": err_msg})
        return JSONResponse({"status": "error", "response": err_msg}, status_code=500)

class WhatsAppResolvePayload(BaseModel):
    id: str
    response: str

@app.post("/api/whatsapp/resolve-prompt")
async def handle_whatsapp_resolve_prompt(payload: WhatsAppResolvePayload):
    return JSONResponse({"status": "ok"})

class ConfigPayload(BaseModel):
    action_ai_key: Optional[str] = ""
    action_ai_model_id: Optional[str] = "gemini-3.8-flash-high"
    action_ai_provider: Optional[str] = "antigravity"

@app.post("/api/config")
async def update_config(cfg: ConfigPayload):
    save_config(cfg.dict())
    return JSONResponse({"status": "ok"})

@app.get("/api/config")
async def get_config():
    cfg = load_config()
    return JSONResponse({
        "has_api_key": bool(cfg.get("action_ai_key")),
        "model_id": cfg.get("action_ai_model_id", "gemini-3.8-flash-high"),
        "provider": cfg.get("action_ai_provider", "antigravity")
    })

class GoogleAuthRequest(BaseModel):
    credential: str

@app.get("/api/auth/config")
async def get_auth_config():
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    return JSONResponse({
        "google_client_id": client_id,
        "is_configured": bool(client_id)
    })

@app.post("/api/auth/google")
async def verify_google_token(payload: GoogleAuthRequest):
    credential = payload.credential.strip()
    if not credential:
        raise HTTPException(status_code=400, detail="Token credential is required.")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}")
            if resp.status_code == 200:
                data = resp.json()
                return JSONResponse({
                    "success": True,
                    "user": {
                        "id": data.get("sub"),
                        "name": data.get("name", "User"),
                        "email": data.get("email", ""),
                        "picture": data.get("picture", ""),
                        "given_name": data.get("given_name", "User"),
                        "provider": "google"
                    }
                })
            else:
                error_body = resp.text
                raise HTTPException(status_code=401, detail=f"Invalid Google token: {error_body}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Failed to contact Google auth server: {str(e)}")
