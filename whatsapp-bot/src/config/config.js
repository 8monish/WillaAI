const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env from whatsapp-bot root directory or current working directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Also attempt loading from current working directory if different
dotenv.config();

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null) return defaultValue;
  const s = String(value).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
};

const cleanPhoneNumber = (raw) => {
  if (!raw) return '';
  const withoutDomain = String(raw).split('@')[0];
  const withoutDevice = withoutDomain.split(':')[0];
  return withoutDevice.replace(/\D/g, '');
};

const parseOwnerNumbers = (raw) => {
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map((s) => cleanPhoneNumber(s))
    .filter(Boolean);
};

const isOwnerMatch = (candidate, ownerConfig, client = null) => {
  if (!candidate) return false;
  const candidates = (Array.isArray(candidate) ? candidate : [candidate])
    .map((c) => cleanPhoneNumber(c))
    .filter(Boolean);

  if (candidates.length === 0) return false;

  const owners = parseOwnerNumbers(ownerConfig);

  // The account currently authenticated in WhatsApp Web is always an authorized owner
  if (client?.info?.wid?.user) {
    const linkedNum = cleanPhoneNumber(client.info.wid.user);
    if (linkedNum && !owners.includes(linkedNum)) {
      owners.push(linkedNum);
    }
  }

  return candidates.some((c) =>
    owners.some((o) => c === o || c.endsWith(o) || o.endsWith(c))
  );
};

const parseAllowedSenders = (raw) => {
  if (!raw || raw.trim() === '*' || raw.trim() === '') {
    return null; // Null means allow all senders
  }
  return raw
    .split(',')
    .map((s) => cleanPhoneNumber(s))
    .filter(Boolean);
};

const detectChromeExecutable = () => {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.env.CHROME_BIN) {
    return process.env.CHROME_BIN;
  }
  const candidatePaths = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined; // Puppeteer will attempt to locate its bundled binary
};

const config = {
  // Remote System & Owner Configuration
  owner: {
    // Specific phone number or comma-separated numbers (e.g. 919361430509,919363936963)
    phoneNumber: (process.env.OWNER_PHONE_NUMBER || process.env.TARGET_PHONE_NUMBER || '').trim(),
    // Automatically bind the first number that messages the bot if no OWNER_PHONE_NUMBER is set
    autoBindFirstSender: parseBoolean(process.env.AUTO_BIND_OWNER, true),
    // Send welcome greeting upon connection
    sendGreetingOnReady: parseBoolean(process.env.SEND_GREETING_ON_READY, true),
  },

  // AI Engine settings: 'agy' (native local Gemini agent) or 'openai' (remote OpenAI API)
  aiEngine: (process.env.AI_ENGINE || 'agy').toLowerCase(),

  // Local RipeAI / agy settings
  agy: {
    model: process.env.AGY_MODEL || 'gemini-3.8-flash-high',
    workspacePath: process.env.RIPEAI_WORKSPACE || path.resolve(__dirname, '../../..'),
  },

  // Remote OpenAI-compatible provider settings (optional fallback)
  openai: {
    apiKey: process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '',
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },

  // Session persistence
  session: {
    dataPath: path.resolve(process.env.SESSION_DATA_PATH || './.wweb_auth'),
  },

  // Message filtering & triggers
  bot: {
    triggerPrefix: process.env.TRIGGER_PREFIX !== undefined ? process.env.TRIGGER_PREFIX : '',
    allowedSenders: parseAllowedSenders(process.env.ALLOWED_SENDERS),
    respondToGroups: parseBoolean(process.env.RESPOND_TO_GROUPS, false),
    // Phone-originated messages in the linked account's own chat are marked
    // `fromMe`. whatsapp.js filters bot-generated web messages separately.
    respondToSelf: parseBoolean(process.env.RESPOND_TO_SELF, true),
  },

  // Puppeteer / Browser settings
  puppeteer: {
    headless: parseBoolean(process.env.HEADLESS, true),
    executablePath: detectChromeExecutable(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
  },
};

/**
 * Check whether a message should be processed according to access control and trigger rules
 * @param {import('whatsapp-web.js').Message} msg 
 * @param {import('whatsapp-web.js').Client} [client]
 * @returns {Promise<{ shouldProcess: boolean, isOwner: boolean, senderNumber: string, prompt: string, reason?: string }>}
 */
async function evaluateMessage(msg, client = null) {
  // 1. Ignore status/broadcast updates
  if (msg.from === 'status@broadcast' || msg.to === 'status@broadcast') {
    return { shouldProcess: false, reason: 'status update' };
  }

  // 2. Ignore group messages unless enabled
  const isGroup = (msg.from && msg.from.endsWith('@g.us')) || (msg.to && msg.to.endsWith('@g.us'));
  if (isGroup && !config.bot.respondToGroups) {
    return { shouldProcess: false, reason: 'group messages disabled' };
  }

  const ownerConfig = config.owner.phoneNumber;
  const ownNumber = cleanPhoneNumber(client?.info?.wid?.user || '');

  const rawSender = msg.author || msg.from || '';
  const rawRecipient = msg.to || '';

  let senderNumber = cleanPhoneNumber(rawSender);
  let isOwner = false;

  // Collect candidate phone numbers for sender (resolves WhatsApp Multi-Device LIDs)
  const candidateSenders = [];
  if (senderNumber) candidateSenders.push(senderNumber);

  // Attempt resolving contact object (whatsapp-web.js Contact structure)
  if (typeof msg.getContact === 'function') {
    try {
      const contact = await msg.getContact();
      if (contact) {
        if (contact.number) candidateSenders.push(cleanPhoneNumber(contact.number));
        if (contact.id?.user) candidateSenders.push(cleanPhoneNumber(contact.id.user));
      }
    } catch (_) {}
  }

  // Attempt resolving LID to PN via internal WhatsApp Web API if available
  if (client && typeof client.getContactLidAndPhone === 'function' && String(rawSender).includes('@lid')) {
    try {
      const lidRes = await client.getContactLidAndPhone([rawSender]);
      if (lidRes && lidRes[0] && lidRes[0].pn) {
        candidateSenders.push(cleanPhoneNumber(lidRes[0].pn));
      }
    } catch (_) {}
  }

  // 3. Check if message is from the linked account / owner
  if (msg.fromMe) {
    if (!config.bot.respondToSelf) {
      return { shouldProcess: false, reason: 'sent by self (respondToSelf is disabled)' };
    }

    const senderPrefix = rawSender.split('@')[0].split(':')[0];
    const recipientPrefix = rawRecipient.split('@')[0].split(':')[0];
    const ownWidPrefix = client?.info?.wid?._serialized ? client.info.wid._serialized.split('@')[0].split(':')[0] : '';

    // Self-chat detection (works with both phone numbers and WhatsApp Multi-Device LIDs):
    // 1) senderPrefix === recipientPrefix (e.g. self-chat Message Yourself)
    // 2) sender or recipient matches client own wid prefix
    // 3) sender or recipient matches owner phone
    const isSelfChat = Boolean(
      (senderPrefix && recipientPrefix && senderPrefix === recipientPrefix) ||
      (ownWidPrefix && (senderPrefix === ownWidPrefix || recipientPrefix === ownWidPrefix)) ||
      (ownNumber && (isOwnerMatch(rawRecipient, ownNumber, client) || isOwnerMatch(rawSender, ownNumber, client))) ||
      (ownerConfig && (isOwnerMatch(rawRecipient, ownerConfig, client) || isOwnerMatch(rawSender, ownerConfig, client)))
    );

    // If message was sent to an external third party contact, do not intercept
    if (!isSelfChat) {
      return { shouldProcess: false, reason: 'outgoing message to another contact' };
    }

    isOwner = true;
    senderNumber = ownNumber || parseOwnerNumbers(ownerConfig)[0] || senderPrefix;
  } else {
    // Message received from another WhatsApp account or phone
    if (ownerConfig || ownNumber) {
      if (isOwnerMatch(candidateSenders, ownerConfig, client)) {
        isOwner = true;
        // Prefer real 10-13 digit phone number instead of internal 15-digit LID
        const realPhone = candidateSenders.find(c => c && c.length <= 13 && c !== senderNumber);
        if (realPhone) senderNumber = realPhone;
      } else {
        return { 
          shouldProcess: false, 
          isOwner: false, 
          senderNumber, 
          reason: `unauthorized sender (${candidateSenders.join(', ')} not in authorized owners: ${ownerConfig || ownNumber})` 
        };
      }
    } else if (config.owner.autoBindFirstSender && !isGroup) {
      config.owner.phoneNumber = senderNumber;
      isOwner = true;
    }
  }

  // 4. Allowed sender whitelist check (if configured)
  if (config.bot.allowedSenders && config.bot.allowedSenders.length > 0) {
    const isAllowed = config.bot.allowedSenders.some(allowed => isOwnerMatch(candidateSenders, allowed));
    if (!isAllowed) {
      return { shouldProcess: false, isOwner, senderNumber, reason: `sender ${senderNumber} not in whitelist` };
    }
  }

  // 5. Trigger prefix check
  const body = (msg.body || '').trim();
  const prefix = config.bot.triggerPrefix;

  let prompt = body;
  if (prefix && prefix.length > 0) {
    if (!body.toLowerCase().startsWith(prefix.toLowerCase())) {
      return { shouldProcess: false, isOwner, senderNumber, reason: `does not start with prefix "${prefix}"` };
    }
    prompt = body.slice(prefix.length).trim();
  }

  if (!prompt) {
    return { shouldProcess: false, isOwner, senderNumber, reason: 'empty prompt' };
  }

  return { shouldProcess: true, isOwner, senderNumber, prompt };
}

module.exports = {
  config,
  evaluateMessage,
  cleanPhoneNumber,
  parseOwnerNumbers,
  isOwnerMatch,
};
