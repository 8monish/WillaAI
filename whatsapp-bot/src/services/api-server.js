const http = require('http');
const fs = require('fs');
const { config, cleanPhoneNumber } = require('../config/config');
const { 
  getWaStatus, 
  getQrBase64, 
  setOwnerNumber, 
  initializeWhatsAppClient, 
  stopWhatsAppClient,
  getClient,
  isClientReady
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
      return sendJson(res, 200, {
        status: getWaStatus(),
        qr_base64: getQrBase64(),
        owner_number: config.owner.phoneNumber,
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

      return sendJson(res, 200, {
        status: getWaStatus(),
        owner_number: config.owner.phoneNumber,
      });
    }

    // POST /api/whatsapp/ping
    if (req.method === 'POST' && (url === '/api/whatsapp/ping' || url === '/ping')) {
      const client = getClient();
      if (!client || !isClientReady() || !config.owner.phoneNumber) {
        return sendJson(res, 400, { success: false, error: 'Client not connected or owner number not set.' });
      }
      try {
        const jid = `${config.owner.phoneNumber}@c.us`;
        await client.sendMessage(jid, '🔔 *RipeAI Remote Ping:* Your machine is connected and actively listening for commands! 🚀');
        return sendJson(res, 200, { success: true, message: `Ping sent to +${config.owner.phoneNumber}` });
      } catch (err) {
        return sendJson(res, 500, { success: false, error: err.message });
      }
    }

    // POST /api/whatsapp/send-to-owner (two-way sync from Web UI)
    if (req.method === 'POST' && (url === '/api/whatsapp/send-to-owner' || url === '/send-to-owner' || url === '/send')) {
      const payload = await parseJsonBody(req);
      const client = getClient();
      if (!client || !isClientReady() || !config.owner.phoneNumber) {
        return sendJson(res, 200, { success: false, reason: 'Client not ready or owner number not set' });
      }
      try {
        const jid = `${config.owner.phoneNumber}@c.us`;
        const text = payload.message || '';
        if (text) {
          await client.sendMessage(jid, text);
          logger.chat('OUT', config.owner.phoneNumber, text);
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
      
      // Optionally remove session directory to allow a fresh QR scan
      try {
        if (fs.existsSync(config.session.dataPath)) {
          fs.rmSync(config.session.dataPath, { recursive: true, force: true });
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
