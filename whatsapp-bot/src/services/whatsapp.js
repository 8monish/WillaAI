const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const os = require('os');
const { config, evaluateMessage, cleanPhoneNumber } = require('../config/config');
const { generateAIResponse } = require('./ai');
const { 
  executeDirectCommand, 
  runAgyAgent, 
  getSystemStatus, 
  getCwd 
} = require('./system-agent');
const logger = require('../utils/logger');

let client = null;
let isReady = false;
let waStatus = 'disconnected'; // 'disconnected' | 'starting' | 'qr' | 'connected' | 'error'
let qrBase64 = '';

function getWaStatus() {
  return waStatus;
}

function getQrBase64() {
  return qrBase64;
}

function setOwnerNumber(rawNumber) {
  const cleaned = cleanPhoneNumber(rawNumber);
  config.owner.phoneNumber = cleaned;
  logger.info(`Owner phone number set to: +${cleaned}`);
  return cleaned;
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
  const ownerNumber = config.owner.phoneNumber;
  if (!ownerNumber) {
    logger.warn('No OWNER_PHONE_NUMBER set. Waiting for your first WhatsApp message to pair automatically.');
    return;
  }

  const ownerJid = `${ownerNumber}@c.us`;
  logger.info(`Sending proactive welcome handshake message to owner [${ownerJid}]...`);
  
  try {
    await client.sendMessage(ownerJid, buildWelcomeMessage());
    logger.success(`Greeting successfully sent to ${ownerNumber}!`);
  } catch (err) {
    logger.error(`Failed to send proactive greeting to ${ownerNumber}:`, err);
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
    logger.success('WhatsApp client is authenticated and actively listening for messages!');
    
    const ownerNotice = config.owner.phoneNumber 
      ? `Locked to: +${config.owner.phoneNumber}` 
      : 'Waiting to auto-pair with first sender';

    const engineNotice = config.aiEngine === 'agy' 
      ? `Local agy (${config.agy.model})` 
      : `OpenAI API (${config.openai.model})`;

    logger.banner('RipeAI WhatsApp Remote Control Active', [
      `Owner DM: ${ownerNotice}`,
      `AI Engine: ${engineNotice}`,
      `Workspace: ${getCwd()}`,
      `Session Path: ${config.session.dataPath}`,
    ]);

    // Send proactive greeting to the owner
    if (config.owner.sendGreetingOnReady && config.owner.phoneNumber) {
      setTimeout(() => {
        sendGreetingToOwner().catch((e) => logger.error('Greeting error:', e));
      }, 2000);
    }
  });

  // ==========================================
  // Event: Incoming Message (STRICT OWNER FILTER)
  // ==========================================
  client.on('message', async (msg) => {
    try {
      const { shouldProcess, isOwner, senderNumber, prompt, reason } = evaluateMessage(msg);

      // STRICT OWNER FILTER: completely ignore all other senders
      if (!shouldProcess) {
        return;
      }

      logger.chat('IN', senderNumber, msg.body || '');

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

      const lower = prompt.trim().toLowerCase();
      let responseText = '';

      // 1. Quick Helper Commands
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
      // 2. Direct Shell Command Prefix ($ or !)
      else if (prompt.startsWith('$') || prompt.startsWith('!')) {
        const cmd = prompt.replace(/^[$!]\s*/, '').trim();
        responseText = await executeDirectCommand(cmd);
      } 
      // 3. AI Agent Execution (Native Local Gemini 'agy' or OpenAI)
      else {
        if (config.aiEngine === 'agy') {
          responseText = await runAgyAgent(prompt, config.agy.model);
        } else {
          responseText = await generateAIResponse(prompt, { sender: senderNumber });
        }
      }

      // Send threaded reply back to the user
      await msg.reply(responseText);
      logger.chat('OUT', senderNumber, responseText);

      // Clear typing indicator
      if (chat) {
        try {
          await chat.clearState();
        } catch (_) {}
      }
    } catch (err) {
      logger.error('Unexpected error handling incoming message:', err);
      try {
        await msg.reply("⚠️ *Error:* An unexpected issue occurred while executing your request on the system.");
      } catch (_) {}
    }
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
      client = null;
      logger.success('WhatsApp Web client closed cleanly.');
    } catch (err) {
      logger.error('Error during client destruction:', err);
    }
  }
}

module.exports = {
  initializeWhatsAppClient,
  stopWhatsAppClient,
  sendGreetingToOwner,
  getWaStatus,
  getQrBase64,
  setOwnerNumber,
  getClient: () => client,
  isClientReady: () => isReady,
};
