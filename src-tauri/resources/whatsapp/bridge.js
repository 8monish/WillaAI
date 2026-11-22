// WillaAI WhatsApp bridge. Talks to the Rust app over stdin/stdout (JSON lines).
// Only "message yourself" chats are read, so nobody else can control your computer.
const { Client, LocalAuth } = require("whatsapp-web.js");
const readline = require("readline");

const out = (o) => process.stdout.write(JSON.stringify(o) + "\n");
const PREFIX = "🤖 ";
const sent = new Set();
let me = null;
let selfChat = null;

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: process.env.WA_DATA }),
  puppeteer: {
    headless: true,
    executablePath: process.env.WA_CHROME || undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  },
});

client.on("qr", (qr) => out({ type: "qr", data: qr }));
client.on("loading_screen", (p) => out({ type: "status", message: `Loading WhatsApp… ${p}%` }));
client.on("authenticated", () => out({ type: "status", message: "Linked. Starting…" }));
client.on("auth_failure", (m) => out({ type: "error", message: "Authentication failed: " + m }));
client.on("ready", () => {
  me = client.info.wid._serialized;
  out({ type: "ready", me: client.info.wid.user, name: client.info.pushname || "" });
});
client.on("disconnected", (r) => {
  out({ type: "disconnected", reason: String(r) });
  process.exit(0);
});

client.on("message_create", async (msg) => {
  try {
    if (!me || !msg.fromMe || !msg.body) return;
    // "Message yourself" chat: sender and recipient are both you.
    const isSelf = msg.to === me || msg.from === msg.to;
    if (!isSelf) return;
    if (sent.has(msg.id._serialized) || msg.body.startsWith(PREFIX)) return;
    selfChat = msg.to;
    out({ type: "message", body: msg.body });
  } catch (e) {
    out({ type: "error", message: String(e) });
  }
});

readline.createInterface({ input: process.stdin }).on("line", async (line) => {
  let cmd;
  try { cmd = JSON.parse(line); } catch { return; }
  try {
    if (cmd.type === "send" && me) {
      const m = await client.sendMessage(selfChat || me, PREFIX + cmd.text);
      sent.add(m.id._serialized);
    } else if (cmd.type === "logout") {
      await client.logout().catch(() => {});
      process.exit(0);
    } else if (cmd.type === "quit") {
      await client.destroy().catch(() => {});
      process.exit(0);
    }
  } catch (e) {
    out({ type: "error", message: String(e) });
  }
});

client.initialize().catch((e) => {
  out({ type: "error", message: "Could not start WhatsApp: " + e });
  process.exit(1);
});
