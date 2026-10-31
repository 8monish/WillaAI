const http = require('http');
const fs = require('fs');
const { config, cleanPhoneNumber, parseOwnerNumbers } = require('../config/config');
const { 
  getWaStatus, 
  getQrBase64, 
  setOwnerNumber, 
  initializeWhatsAppClient, 
  stopWhatsAppClient,
  getClient,
  isClientReady,
  recordBotSentMessageId,
  registerPendingBotMessage
} = require('./whatsapp');
const logger = require('../utils/logger');

const PORT = parseInt(process.env.WA_API_PORT || '8008', 10);

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

function startApiServer() {
  const server = http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      return res.end();
    }

    const url = req.url || '';

    // GET /api/whatsapp/status
    if (req.method === 'GET' && (url === '/api/whatsapp/status' || url === '/status')) {
      const client = getClient();
      const connectedNumber = cleanPhoneNumber(client?.info?.wid?.user);
      return sendJson(res, 200, {
        status: getWaStatus(),
        qr_base64: getQrBase64(),
        owner_number: config.owner.phoneNumber,
        connected_number: connectedNumber,
        is_ready: getWaStatus() === 'connected',
      });
    }

    // POST /api/whatsapp/start
    if (req.method === 'POST' && (url === '/api/whatsapp/start' || url === '/start')) {
      const payload = await parseJsonBody(req);
      if (payload.owner_number) {
        setOwnerNumber(payload.owner_number);
      }
      
      const status = getWaStatus();
      if (status === 'disconnected' || status === 'error') {
        initializeWhatsAppClient();
      }

      const client = getClient();
      const connectedNumber = cleanPhoneNumber(client?.info?.wid?.user);

      return sendJson(res, 200, {
        status: getWaStatus(),
        owner_number: config.owner.phoneNumber,
        connected_number: connectedNumber,
      });
    }

    // POST /api/whatsapp/ping
    if (req.method === 'POST' && (url === '/api/whatsapp/ping' || url === '/ping')) {
      const client = getClient();
      if (!client || !isClientReady()) {
        return sendJson(res, 400, { success: false, error: 'Client not connected.' });
      }
      const connectedNumber = cleanPhoneNumber(client?.info?.wid?.user);
      const owners = parseOwnerNumbers(config.owner.phoneNumber);
      const target = connectedNumber || owners[0];
      if (!target) {
        return sendJson(res, 400, { success: false, error: 'No phone number available to ping.' });
      }
      try {
        const jid = `${target}@c.us`;
        await client.sendMessage(jid, '🔔 *RipeAI Remote Ping:* Your machine is connected and actively listening for commands! 🚀');
        return sendJson(res, 200, { success: true, message: `Ping sent to +${target}` });
      } catch (err) {
        return sendJson(res, 500, { success: false, error: err.message });
      }
    }

    // POST /api/whatsapp/send-to-owner (two-way sync from Web UI)
    if (req.method === 'POST' && (url === '/api/whatsapp/send-to-owner' || url === '/send-to-owner' || url === '/send')) {
      const payload = await parseJsonBody(req);
      const client = getClient();
      if (!client || !isClientReady()) {
        return sendJson(res, 200, { success: false, reason: 'Client not ready' });
      }

      const connectedNumber = cleanPhoneNumber(client?.info?.wid?.user);
      const owners = parseOwnerNumbers(config.owner.phoneNumber);
      const targets = new Set();
      if (connectedNumber) targets.add(connectedNumber);
      for (const num of owners) {
        if (num) targets.add(num);
      }

      if (targets.size === 0) {
        return sendJson(res, 200, { success: false, reason: 'No owner number configured' });
      }

      try {
        const text = payload.message || '';
        if (text) {
          registerPendingBotMessage(text);
          for (const num of targets) {
            try {
              const jid = `${num}@c.us`;
              const sent = await client.sendMessage(jid, text);
              if (sent?.id?._serialized) {
                recordBotSentMessageId(sent.id._serialized);
              }
              logger.chat('OUT', num, text);
            } catch (targetErr) {
              logger.warn(`Failed to send to +${num}:`, targetErr.message);
            }
          }
        }
        return sendJson(res, 200, { success: true });
      } catch (err) {
        logger.error('Failed to send message to owner WhatsApp:', err);
        return sendJson(res, 500, { success: false, error: err.message });
      }
    }

    // POST /api/whatsapp/disconnect
    if (req.method === 'POST' && (url === '/api/whatsapp/disconnect' || url === '/disconnect')) {
      await stopWhatsAppClient();
      
      // Delay briefly to allow file handles to be released
      await new Promise(r => setTimeout(r, 800));

      // Optionally remove session directory to allow a fresh QR scan
      try {
        if (fs.existsSync(config.session.dataPath)) {
          fs.rmSync(config.session.dataPath, { recursive: true, force: true });
          logger.info('WhatsApp session data deleted successfully.');
        }
      } catch (err) {
        logger.error('Failed to remove session directory on disconnect:', err);
      }

      return sendJson(res, 200, {
        status: 'disconnected',
        message: 'WhatsApp session unlinked successfully.',
      });
    }

    // Fallback 404
    sendJson(res, 404, { error: 'Not found' });
  });

  server.listen(PORT, '127.0.0.1', () => {
    logger.info(`WhatsApp internal API bridge listening on http://127.0.0.1:${PORT}`);
  });

  return server;
}

module.exports = {
  startApiServer,
};
