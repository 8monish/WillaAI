/**
 * Utility to format and sanitize LLM output for WhatsApp markdown.
 * 
 * WhatsApp formatting rules:
 * - *bold* (single asterisk)
 * - _italics_ (single underscore)
 * - ~strikethrough~ (tilde)
 * - ```monospace``` (triple backtick)
 * - WhatsApp does NOT render markdown headers (#, ##, ###) or HTML tags.
 */

function formatForWhatsApp(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let formatted = text;

  // 1. Convert markdown headers (### Header, ## Header, # Header) to *Header*
  formatted = formatted.replace(/^#{1,6}\s+(.+)$/gm, '*$1*');

  // 2. Convert standard markdown bold (**text**) to WhatsApp bold (*text*)
  // Be careful not to alter triple backtick code blocks
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '*$1*');

  // 3. Ensure bullet lists use clean, punchy WhatsApp bullet characters
  formatted = formatted.replace(/^\s*[-*+]\s+/gm, '• ');

  // 4. Clean up any accidental HTML tags (<b>, </i>, etc.)
  formatted = formatted.replace(/<[^>]*>/g, '');

  // 5. Trim trailing whitespace on each line and normalize excessive newlines
  formatted = formatted
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return formatted;
}

module.exports = {
  formatForWhatsApp,
};
