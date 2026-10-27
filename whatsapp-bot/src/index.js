const { config } = require('./config/config');
const { initializeWhatsAppClient, stopWhatsAppClient } = require('./services/whatsapp');
const { startApiServer } = require('./services/api-server');
const { getCwd } = require('./services/system-agent');
const logger = require('./utils/logger');

// Display startup info
const engineDesc = config.aiEngine === 'agy'
  ? `Local Antigravity Agent (Model: ${config.agy.model})`
  : `OpenAI Endpoint (${config.openai.model})`;

const ownerDesc = config.owner.phoneNumber
  ? `+${config.owner.phoneNumber} (Locked to Owner DM)`
  : 'Auto-detecting (Will pair to your first message)';

logger.banner('RipeAI WhatsApp Remote Terminal & Agent', [
  'Interface: WhatsApp Web Emulation (QR / LocalAuth)',
  `Owner DM: ${ownerDesc}`,
  `AI Engine: ${engineDesc}`,
  `Workspace: ${getCwd()}`,
  `Session Directory: ${config.session.dataPath}`,
]);

if (config.aiEngine === 'openai' && !config.openai.apiKey) {
  logger.warn('No OPENAI_API_KEY detected in .env file for OpenAI engine mode.');
} else if (config.aiEngine === 'agy') {
  logger.info('Using local Gemini agent (agy) for system tools and execution. No API key needed!');
}

// Start the WhatsApp Client and internal API bridge
initializeWhatsAppClient();
startApiServer();

// Handle graceful shutdown signals
let isShuttingDown = false;
async function handleShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('\n');
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  
  try {
    await stopWhatsAppClient();
  } catch (err) {
    logger.error('Error during shutdown:', err);
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

// Prevent uncaught errors from crashing the bot
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception in process:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', reason);
});
