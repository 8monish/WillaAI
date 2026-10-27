const { spawn, exec } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { formatForWhatsApp } = require('../utils/formatter');
const logger = require('../utils/logger');

// Track dynamic working directory across commands (defaults to RipeAI project root)
let currentCwd = process.env.RIPEAI_WORKSPACE 
  ? path.resolve(process.env.RIPEAI_WORKSPACE) 
  : path.resolve(__dirname, '../../..');

if (!fs.existsSync(currentCwd)) {
  currentCwd = process.cwd();
}

function getCwd() {
  return currentCwd;
}

function setCwd(newPath) {
  const resolved = path.resolve(currentCwd, newPath);
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    currentCwd = resolved;
    return { success: true, cwd: currentCwd };
  }
  return { success: false, error: `Directory not found: ${newPath}` };
}

/**
 * Execute a direct shell command on the host machine
 * @param {string} command 
 * @returns {Promise<string>}
 */
function executeDirectCommand(command) {
  return new Promise((resolve) => {
    const trimmed = command.trim();

    // Handle 'cd' commands
    if (trimmed === 'cd' || trimmed.startsWith('cd ')) {
      const targetDir = trimmed === 'cd' ? os.homedir() : trimmed.slice(3).trim();
      const res = setCwd(targetDir);
      if (res.success) {
        return resolve(`📂 *Changed directory to:*\n\`${res.cwd}\``);
      } else {
        return resolve(`❌ *Error:* ${res.error}`);
      }
    }

    logger.info(`[Direct Shell Exec] Running: "${trimmed}" in ${currentCwd}`);

    exec(trimmed, { cwd: currentCwd, timeout: 45000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      let output = (stdout || '').trim();
      if (stderr && stderr.trim()) {
        output += (output ? '\n' : '') + `STDERR:\n${stderr.trim()}`;
      }

      if (error && error.killed) {
        return resolve(`⏱️ *Error:* Command timed out after 45 seconds.`);
      }

      if (!output) {
        output = '(Command completed successfully with no output)';
      }

      // Truncate if output exceeds WhatsApp message comfort limit (~3500 chars)
      if (output.length > 3500) {
        output = output.slice(0, 3400) + '\n... [Output truncated]';
      }

      const response = `🖥️ *Executed:* \`${trimmed}\`\n\n\`\`\`bash\n${output}\n\`\`\``;
      resolve(response);
    });
  });
}

/**
 * Run prompt using the native RipeAI AI engine (`agy` with local Gemini model and tools)
 * @param {string} prompt 
 * @param {string} [model]
 * @returns {Promise<string>}
 */
function runAgyAgent(prompt, model = 'gemini-3.8-flash-high') {
  return new Promise((resolve) => {
    logger.info(`[RipeAI Agent] Invoking agy CLI with model [${model}] for prompt: "${prompt.slice(0, 80)}..."`);

    const args = [
      '--model', model,
      '--dangerously-skip-permissions',
      '--output-format', 'stream-json',
      '-p', prompt,
    ];

    let fullResponse = '';
    const toolsExecuted = [];
    let proc;

    try {
      proc = spawn('agy', args, { cwd: currentCwd });
    } catch (err) {
      logger.error('Failed to spawn agy process:', err);
      return resolve(`❌ *Error:* Could not start the local AI agent (\`agy\`). Ensure \`agy\` is installed on PATH.`);
    }

    let buffer = '';

    proc.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep uncompleted line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const data = jsonParseSafe(trimmed);
          if (!data) continue;

          // Track tool execution events (e.g. commands run by the agent)
          if (data.event === 'step_update') {
            const su = data.step_update || {};
            if (su.step_type === 'tool' && su.state === 'ACTIVE') {
              const toolName = su.tool_name || 'tool';
              const cmd = su.tool_info?.parameters?.CommandLine;
              if (cmd) {
                toolsExecuted.push(`\`${cmd}\``);
              } else {
                toolsExecuted.push(`_${toolName}_`);
              }
            }
          } else if (data.event === 'result') {
            const resp = data.result?.response;
            if (resp) {
              fullResponse = resp;
            }
          }
        } catch (_) {}
      }
    });

    let stderrOutput = '';
    proc.stderr.on('data', (chunk) => {
      stderrOutput += chunk.toString();
    });

    proc.on('close', (code) => {
      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const data = jsonParseSafe(buffer.trim());
          if (data?.event === 'result'?.response) {
            fullResponse = data.result.response;
          }
        } catch (_) {}
      }

      if (!fullResponse.trim()) {
        if (code !== 0 && stderrOutput.trim()) {
          logger.warn(`agy finished with code ${code}: ${stderrOutput}`);
          return resolve(`⚠️ *RipeAI Agent stopped with an error (Code ${code}):*\n\`\`\`\n${stderrOutput.slice(0, 500)}\n\`\`\``);
        }
        fullResponse = 'Task completed successfully.';
      }

      // Format for WhatsApp
      let formatted = formatForWhatsApp(fullResponse);

      // Add summary of tools/actions if any were executed
      if (toolsExecuted.length > 0) {
        const uniqueTools = [...new Set(toolsExecuted)].slice(0, 5);
        const actionPrefix = `⚡ *Actions executed:* ${uniqueTools.join(', ')}\n\n`;
        formatted = actionPrefix + formatted;
      }

      resolve(formatted);
    });

    proc.on('error', (err) => {
      logger.error('Error in agy child process:', err);
      resolve(`❌ *Error executing local AI agent:* ${err.message}`);
    });
  });
}

function jsonParseSafe(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Returns formatted host system status
 */
function getSystemStatus() {
  const uptimeSec = os.uptime();
  const hours = Math.floor(uptimeSec / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);

  const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
  const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);
  const usedMem = (totalMem - freeMem).toFixed(1);
  const load = os.loadavg().map((l) => l.toFixed(2)).join(', ');

  return `📊 *System Status:*\n` +
    `• *Host:* \`${os.hostname()}\` (${os.type()} ${os.arch()})\n` +
    `• *User:* \`${os.userInfo().username}\`\n` +
    `• *Uptime:* ${hours}h ${minutes}m\n` +
    `• *Memory:* ${usedMem} GB / ${totalMem} GB (Free: ${freeMem} GB)\n` +
    `• *Load Average:* ${load}\n` +
    `• *Working Directory:* \`${currentCwd}\``;
}

module.exports = {
  executeDirectCommand,
  runAgyAgent,
  getSystemStatus,
  getCwd,
  setCwd,
};
