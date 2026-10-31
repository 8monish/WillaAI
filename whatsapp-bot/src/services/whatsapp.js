const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { config, evaluateMessage, cleanPhoneNumber, parseOwnerNumbers, isOwnerMatch } = require('../config/config');
const { generateAIResponse } = require('./ai');
const { 
  executeDirectCommand, 
  runAgyAgent, 
  getSystemStatus, 
  getCwd 
} = require('./system-agent');
const { formatForWhatsApp } = require('../utils/formatter');
const logger = require('../utils/logger');

let client = null;
let isReady = false;
let waStatus = 'disconnected'; // 'disconnected' | 'starting' | 'qr' | 'connected' | 'error'
let qrBase64 = '';
const processedMessageIds = new Set();
const botSentMessageIds = new Set();
const recentBotSentTexts = new Map();
const recentIncomingPrompts = new Map();

function getMessageUniqueId(msg) {
  if (!msg) return `wa_${Date.now()}`;
  if (typeof msg.id === 'string' && msg.id.length > 0) return msg.id;
  if (msg.id?._serialized) return msg.id._serialized;
  if (msg.id?.id) return `${msg.from || ''}_${msg.id.id}`;
  if (msg._data?.id?._serialized) return msg._data.id._serialized;
  if (msg._data?.id?.id) return `${msg.from || ''}_${msg._data.id.id}`;
  const sender = msg.author || msg.from || 'unknown';
  const ts = msg.timestamp || '';
  const bodySample = (msg.body || '').trim().substring(0, 30);
  return `wa_${sender}_${ts}_${bodySample}`;
}

function normalizeForEchoCheck(text) {
  if (!text) return '';
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/^🤖\s*\*?ripeai:?\*?\s*/i, '')
    .replace(/^[💻🔔🚀👋⚠️]\s*/, '')
    .replace(/\s+/g, ' ');
}

function registerPendingBotMessage(text) {
  if (!text) return;
  const normalized = normalizeForEchoCheck(text);
  if (normalized.length > 0) {
    recentBotSentTexts.set(normalized, Date.now() + 180000); // 3-minute TTL
  }
  const rawClean = String(text).trim().toLowerCase().replace(/\s+/g, ' ');
  if (rawClean.length > 0) {
    recentBotSentTexts.set(rawClean, Date.now() + 180000);
  }
  // Prune expired entries
  const now = Date.now();
  for (const [k, exp] of recentBotSentTexts.entries()) {
    if (exp < now) recentBotSentTexts.delete(k);
  }
}

function isRecentBotMessage(text) {
  if (!text) return false;
  const normalized = normalizeForEchoCheck(text);
  const rawClean = String(text).trim().toLowerCase().replace(/\s+/g, ' ');
  const now = Date.now();
  for (const [k, exp] of recentBotSentTexts.entries()) {
    if (exp >= now) {
      if (k === normalized || k === rawClean) return true;
      if (normalized.length > 15 && (k.startsWith(normalized) || normalized.startsWith(k))) return true;
      if (rawClean.length > 15 && (k.startsWith(rawClean) || rawClean.startsWith(k))) return true;
    }
  }
  return false;
}

function getWaStatus() {
  return waStatus;
}

function getQrBase64() {
  return qrBase64;
}

function setOwnerNumber(rawNumber) {
  if (!rawNumber) return '';
  const numbers = parseOwnerNumbers(rawNumber);
  const normalized = numbers.join(',');
  config.owner.phoneNumber = normalized;
  logger.info(`Owner phone number set to: ${numbers.map((n) => '+' + n).join(', ')}`);

  // Persist to whatsapp-bot/.env so changes survive restarts
  try {
    const envPath = path.resolve(__dirname, '../../.env');
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, 'utf8');
      if (content.includes('OWNER_PHONE_NUMBER=')) {
        content = content.replace(/OWNER_PHONE_NUMBER=.*/g, `OWNER_PHONE_NUMBER=${normalized}`);
      } else {
        content += `\nOWNER_PHONE_NUMBER=${normalized}\n`;
      }
      fs.writeFileSync(envPath, content, 'utf8');
      logger.info(`Persisted OWNER_PHONE_NUMBER=${normalized} to .env`);
    }
  } catch (err) {
    logger.warn('Could not write OWNER_PHONE_NUMBER to .env:', err.message);
  }

  return normalized;
}

function buildWelcomeMessage() {
  return `👋 *Hi! RipeAI is online and connected to your Linux machine.* 💻\n\n` +
    `🖥️ *Host:* \`${os.hostname()}\` (${os.userInfo().username})\n` +
    `📂 *Workspace:* \`${getCwd()}\`\n` +
    `🤖 *AI Engine:* *Gemini 3.8 Flash (Local System Agent)*\n\n` +
    `You can now control your system directly from this WhatsApp chat:\n` +
    `• *Ask anything:* _"What files are in this project?"_ or _"Check disk and RAM"_\n` +
    `• *Run direct bash:* Start with \`$\` (e.g. \`$ free -h\` or \`$ git status\`)\n` +
    `• *Quick commands:* Send \`status\`, \`pwd\`, or \`help\`\n\n` +
    `Ready for your first command! 🚀`;
}

function buildHelpMessage() {
  return `🛠️ *RipeAI WhatsApp Remote Control Commands:*\n\n` +
    `1. *Natural Language AI Prompts:* \n` +
    `   Send any instruction and the local Gemini agent will inspect, run tools, or answer.\n` +
    `   _Example:_ "Check why the test failed" or "Find all python files"\n\n` +
    `2. *Direct Terminal Commands:* \n` +
    `   Prefix with \`$\` or \`!\` to execute immediately in bash.\n` +
    `   _Example:_ \`$ uptime\`, \`$ df -h\`, \`$ ls -la\`\n\n` +
    `3. *Navigation & Quick Actions:* \n` +
    `   • \`status\` - System health & resource usage\n` +
    `   • \`pwd\` - Current working directory\n` +
    `   • \`cd <dir>\` - Change directory\n` +
    `   • \`help\` - Show this guide`;
}

/**
 * Send proactive greeting to the owner
 */
async function sendGreetingToOwner() {
  if (!client || !isReady) return;
  
  const connectedNumber = cleanPhoneNumber(client?.info?.wid?.user);
  const owners = parseOwnerNumbers(config.owner.phoneNumber);
  
  const targets = new Set();
  if (connectedNumber) targets.add(connectedNumber);
  for (const num of owners) {
    if (num) targets.add(num);
  }

  if (targets.size === 0) {
    logger.warn('No OWNER_PHONE_NUMBER set and no linked number. Waiting for your first WhatsApp message to pair automatically.');
    return;
  }

  for (const targetNumber of targets) {
    const ownerJid = `${targetNumber}@c.us`;
    logger.info(`Sending proactive welcome handshake message to owner [${ownerJid}]...`);
    
    try {
      const greeting = buildWelcomeMessage();
      registerPendingBotMessage(greeting);
      const sent = await client.sendMessage(ownerJid, greeting);
      if (sent?.id?._serialized) {
        botSentMessageIds.add(sent.id._serialized);
        processedMessageIds.add(sent.id._serialized);
      }
      logger.success(`Greeting successfully sent to +${targetNumber}!`);
    } catch (err) {
      logger.error(`Failed to send proactive greeting to +${targetNumber}:`, err);
    }
  }
}

/**
 * Initialize and configure the WhatsApp Web client
 */
function initializeWhatsAppClient() {
  if (client && (waStatus === 'starting' || waStatus === 'connected' || waStatus === 'qr')) {
    logger.info(`WhatsApp client already in state [${waStatus}], skipping re-init.`);
    return client;
  }

  waStatus = 'starting';
  qrBase64 = '';
  logger.info(`Configuring WhatsApp client with LocalAuth directory: ${config.session.dataPath}`);

  // Clean up any stale Chromium singleton lock files before launching
  try {
    const sessionDir = path.join(config.session.dataPath, 'session');
    if (fs.existsSync(sessionDir)) {
      const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];
      for (const f of lockFiles) {
        const fullLockPath = path.join(sessionDir, f);
        if (fs.existsSync(fullLockPath)) {
          fs.unlinkSync(fullLockPath);
        }
      }
    }
  } catch (err) {
    logger.warn('Could not clean up stale Chromium lock:', err.message);
  }

  const clientOptions = {
    authStrategy: new LocalAuth({
      dataPath: config.session.dataPath,
    }),
    puppeteer: {
      headless: config.puppeteer.headless,
      ...(config.puppeteer.executablePath ? { executablePath: config.puppeteer.executablePath } : {}),
      args: config.puppeteer.args,
    },
  };

  client = new Client(clientOptions);

  // ==========================================
  // Event: QR Code Received
  // ==========================================
  client.on('qr', async (qr) => {
    waStatus = 'qr';
    try {
      qrBase64 = await QRCode.toDataURL(qr);
    } catch (err) {
      logger.error('Failed to encode QR as base64 data URL:', err);
    }

    logger.warn('Scan the QR code below using WhatsApp (Linked Devices) to authenticate:');
    qrcodeTerminal.generate(qr, { small: true });
    logger.info('Waiting for QR code scan from your phone or Web UI...');
  });

  // ==========================================
  // Event: Authentication Succeeded
  // ==========================================
  client.on('authenticated', () => {
    logger.success('Authentication credentials recognized. Restoring or persisting session...');
  });

  // ==========================================
  // Event: Authentication Failure
  // ==========================================
  client.on('auth_failure', (msg) => {
    waStatus = 'error';
    qrBase64 = '';
    isReady = false;
    logger.error(`Authentication failed: ${msg}`);
  });

  // ==========================================
  // Event: Client Ready
  // ==========================================
  client.on('ready', async () => {
    isReady = true;
    waStatus = 'connected';
    qrBase64 = '';
    
    const linkedNumber = cleanPhoneNumber(client?.info?.wid?.user || '');
    logger.success(`WhatsApp client is authenticated and actively listening! Linked account: +${linkedNumber}`);

    // If config.owner.phoneNumber is empty, auto-bind the connected number!
    if (!config.owner.phoneNumber && linkedNumber) {
      setOwnerNumber(linkedNumber);
    }
    // If the linked number is not in the owners list, dynamically add it
    else if (linkedNumber && !isOwnerMatch(linkedNumber, config.owner.phoneNumber, client)) {
      const updated = config.owner.phoneNumber ? `${config.owner.phoneNumber},${linkedNumber}` : linkedNumber;
      setOwnerNumber(updated);
    }

    const ownerNotice = config.owner.phoneNumber 
      ? `Locked to: ${parseOwnerNumbers(config.owner.phoneNumber).map((n) => '+' + n).join(', ')}` 
      : 'Waiting to auto-pair with first sender';

    const engineNotice = config.aiEngine === 'agy' 
      ? `Local agy (${config.agy.model})` 
      : `OpenAI API (${config.openai.model})`;

    logger.banner('RipeAI WhatsApp Remote Control Active', [
      `Linked Phone: +${linkedNumber || 'Unknown'}`,
      `Owner DM(s): ${ownerNotice}`,
      `AI Engine: ${engineNotice}`,
      `Workspace: ${getCwd()}`,
      `Session Path: ${config.session.dataPath}`,
    ]);

    // Send proactive greeting to the owner
    if (config.owner.sendGreetingOnReady) {
      setTimeout(() => {
        sendGreetingToOwner().catch((e) => logger.error('Greeting error:', e));
      }, 2000);
    }
  });

  /**
   * Forward incoming WhatsApp prompt directly to the RipeAI main application
   * so it displays and executes in real-time on the main web page!
   */
  async function forwardToMainPage(promptText, sender, msgId) {
    try {
      const mainAppUrl = process.env.RIPEAI_BACKEND_URL || 'http://127.0.0.1:8000';
      logger.info(`[Main Page Dispatcher] Routing prompt to ${mainAppUrl}/api/whatsapp/incoming-prompt`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 95000);

      const res = await fetch(`${mainAppUrl}/api/whatsapp/incoming-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: sender,
          prompt: promptText,
          message_id: msgId,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.response) {
          return data.response;
        }
      } else {
        logger.warn(`Main app returned status ${res.status}. Falling back to local execution.`);
      }
    } catch (err) {
      logger.warn(`Could not bridge prompt to main page (${err.message}). Using local execution fallback.`);
    }
    return null;
  }

  // ==========================================
  // Message handling (STRICT OWNER FILTER)
  // ==========================================
  const processIncomingMessage = async (msg) => {
    try {
      if (!msg) return;

      const msgId = getMessageUniqueId(msg);

      // Prevent processing the same message twice
      if (processedMessageIds.has(msgId)) {
        return;
      }
      processedMessageIds.add(msgId);
      if (processedMessageIds.size > 1000) {
        const first = processedMessageIds.values().next().value;
        processedMessageIds.delete(first);
      }

      // Prevent processing messages generated by the bot itself
      if (botSentMessageIds.has(msgId)) {
        return;
      }

      const body = (msg.body || '').trim();

      // Guard against bot echo / automated outgoing notices
      if (
        body.startsWith('🤖') ||
        body.startsWith('💻') ||
        body.startsWith('🔔') ||
        body.startsWith('🚀') ||
        body.startsWith('👋') ||
        body.startsWith('Executed:\n```') ||
        body.startsWith('⚠️') ||
        body.includes('*RipeAI:*') ||
        body.includes('[AI Response]') ||
        body.includes('[RipeAI Response]') ||
        body.includes('[Web Terminal Prompt]') ||
        body.includes('Hi! RipeAI is online and connected') ||
        body.includes('RipeAI WhatsApp Remote Control Commands:')
      ) {
        return;
      }

      // Guard against recently sent bot texts (Content Fingerprint match)
      if (isRecentBotMessage(body)) {
        logger.info(`[Bot Echo Guard] Suppressed outgoing bot reply echo: "${body.substring(0, 40)}..."`);
        return;
      }

      const evalResult = await evaluateMessage(msg, client);
      logger.info(`[WhatsApp Eval] fromMe=${msg.fromMe} id=${msgId} from=${msg.from} to=${msg.to} shouldProcess=${evalResult.shouldProcess} reason=${evalResult.reason || 'OK'}`);

      if (!evalResult.shouldProcess) {
        return;
      }

      const { senderNumber, prompt, isOwner } = evalResult;

      // Deduplicate rapid identical prompts from same sender within 3.5s window
      const promptDedupeKey = `${senderNumber}:${(prompt || '').trim().toLowerCase()}`;
      const now = Date.now();
      if (recentIncomingPrompts.has(promptDedupeKey) && recentIncomingPrompts.get(promptDedupeKey) > now) {
        logger.info(`[Deduplication Guard] Suppressed duplicate prompt within 3.5s: "${prompt.substring(0, 30)}..."`);
        return;
      }
      recentIncomingPrompts.set(promptDedupeKey, now + 3500);
      for (const [k, exp] of recentIncomingPrompts.entries()) {
        if (exp < now) recentIncomingPrompts.delete(k);
      }

      logger.chat('IN', senderNumber, body);

      // Send typing indicator
      let chat;
      try {
        chat = await msg.getChat();
        await chat.sendStateTyping();
      } catch (_) {}

      // If user was newly auto-bound as owner, notify them
      const isFirstBinding = !config.owner.phoneNumber && isOwner;
      if (isFirstBinding) {
        config.owner.phoneNumber = senderNumber;
        logger.success(`Automatically paired ${senderNumber} as the system owner!`);
      }

      // 1. Forward prompt to main page so it displays and executes live on screen
      let responseText = await forwardToMainPage(prompt, senderNumber, msgId);

      // 2. If main page bridge did not answer (e.g. backend was rebooting), use local fallback
      if (!responseText) {
        const lower = prompt.trim().toLowerCase();
        if (lower === 'help' || lower === '?') {
          responseText = buildHelpMessage();
        } else if (lower === 'status') {
          responseText = getSystemStatus();
        } else if (lower === 'pwd') {
          responseText = `📂 *Current Directory:*\n\`${getCwd()}\``;
        } else if (lower.startsWith('cd ') || lower === 'cd') {
          responseText = await executeDirectCommand(prompt);
        } else if (lower === 'clear' || lower === 'reset') {
          responseText = `🧹 *Session reset.* Ready for fresh instructions.`;
        } 
        else if (prompt.startsWith('$') || prompt.startsWith('!')) {
          const cmd = prompt.replace(/^[$!]\s*/, '').trim();
          responseText = await executeDirectCommand(cmd);
        } 
        else {
          if (config.aiEngine === 'agy') {
            responseText = await runAgyAgent(prompt, config.agy.model);
          } else {
            responseText = await generateAIResponse(prompt, { sender: senderNumber });
          }
        }
      }

      // Format clean WhatsApp markdown and prefix with distinct RipeAI marker
      const formattedBody = formatForWhatsApp(responseText);
      const formattedResponse = `🤖 *RipeAI:*\n${formattedBody}`;

      // Pre-register texts in fingerprint cache BEFORE sending to avoid event race
      registerPendingBotMessage(formattedResponse);
      registerPendingBotMessage(formattedBody);
      registerPendingBotMessage(responseText);

      let replySent;
      try {
        if (chat) {
          replySent = await chat.sendMessage(formattedResponse);
        } else {
          replySent = await msg.reply(formattedResponse);
        }
      } catch (err) {
        logger.warn('Failed to reply via chat.sendMessage, trying msg.reply:', err.message);
        replySent = await msg.reply(formattedResponse);
      }

      if (replySent?.id?._serialized) {
        botSentMessageIds.add(replySent.id._serialized);
        processedMessageIds.add(replySent.id._serialized);
      }
      logger.chat('OUT', senderNumber, formattedResponse);

      // Clear typing indicator
      if (chat) {
        try {
          await chat.clearState();
        } catch (_) {}
      }
    } catch (err) {
      logger.error('Unexpected error handling incoming message:', err);
      try {
        if (msg) await msg.reply("⚠️ *Error:* An unexpected issue occurred while executing your request on the system.");
      } catch (_) {}
    }
  };

  // Listen ONLY to 'message_create' because in whatsapp-web.js, 'message_create' fires
  // for ALL messages (both incoming from others AND outgoing from self).
  // Listening to both 'message' and 'message_create' causes duplicate handling!
  client.on('message_create', (msg) => {
    processIncomingMessage(msg).catch((err) => logger.error('Error in message_create listener:', err));
  });

  // ==========================================
  // Event: Disconnected
  // ==========================================
  client.on('disconnected', (reason) => {
    isReady = false;
    waStatus = 'disconnected';
    qrBase64 = '';
    logger.warn(`WhatsApp client was disconnected. Reason: ${reason}`);
  });

  // Start the client
  logger.info('Starting WhatsApp Web client...');
  client.initialize().catch((err) => {
    waStatus = 'error';
    logger.error('Failed to initialize WhatsApp Web client:', err);
  });

  return client;
}

/**
 * Gracefully stop the WhatsApp client and release browser locks
 */
async function stopWhatsAppClient() {
  waStatus = 'disconnected';
  qrBase64 = '';
  isReady = false;
  if (client) {
    logger.info('Shutting down WhatsApp Web client...');
    try {
      await client.destroy();
    } catch (err) {
      logger.error('Error during client destruction:', err);
    }
    client = null;
    logger.success('WhatsApp Web client closed cleanly.');
  }
  // Release any lingering headless Chrome instances attached to session directory
  try {
    const { execSync } = require('child_process');
    execSync('pkill -9 -f "whatsapp-bot/.wweb_auth" || true');
  } catch (_) {}
}

module.exports = {
  initializeWhatsAppClient,
  stopWhatsAppClient,
  sendGreetingToOwner,
  getWaStatus,
  getQrBase64,
  setOwnerNumber,
  registerPendingBotMessage,
  recordBotSentMessageId: (msgId) => { if (msgId) botSentMessageIds.add(msgId); },
  getClient: () => client,
  isClientReady: () => isReady,
};
