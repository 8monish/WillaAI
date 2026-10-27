/**
 * Clean, structured console logger with ANSI styling and timestamps
 */

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
};

function getTimestamp() {
  const now = new Date();
  return `${colors.gray}[${now.toLocaleTimeString()}]${colors.reset}`;
}

const logger = {
  info: (msg, ...args) => {
    console.log(`${getTimestamp()} ${colors.cyan}ℹ [INFO]${colors.reset} ${msg}`, ...args);
  },
  success: (msg, ...args) => {
    console.log(`${getTimestamp()} ${colors.green}✔ [SUCCESS]${colors.reset} ${msg}`, ...args);
  },
  warn: (msg, ...args) => {
    console.warn(`${getTimestamp()} ${colors.yellow}⚠ [WARN]${colors.reset} ${msg}`, ...args);
  },
  error: (msg, error) => {
    console.error(`${getTimestamp()} ${colors.red}✖ [ERROR]${colors.reset} ${msg}`);
    if (error) {
      if (error.stack) {
        console.error(`${colors.gray}${error.stack}${colors.reset}`);
      } else {
        console.error(`${colors.gray}${String(error)}${colors.reset}`);
      }
    }
  },
  chat: (direction, sender, text) => {
    const isIncoming = direction === 'IN';
    const tag = isIncoming ? `${colors.magenta}📥 [RECV]${colors.reset}` : `${colors.green}📤 [SENT]${colors.reset}`;
    const truncated = text.length > 100 ? `${text.slice(0, 97)}...` : text;
    console.log(`${getTimestamp()} ${tag} ${colors.bold}${sender}:${colors.reset} ${truncated.replace(/\n/g, ' ')}`);
  },
  banner: (title, details = []) => {
    const line = '═'.repeat(60);
    console.log(`\n${colors.cyan}${line}${colors.reset}`);
    console.log(`${colors.bold}${colors.green}  ${title}${colors.reset}`);
    if (details.length) {
      console.log(`${colors.gray}  ${'-'.repeat(56)}${colors.reset}`);
      details.forEach((d) => console.log(`  ${colors.dim}•${colors.reset} ${d}`));
    }
    console.log(`${colors.cyan}${line}${colors.reset}\n`);
  },
};

module.exports = logger;
