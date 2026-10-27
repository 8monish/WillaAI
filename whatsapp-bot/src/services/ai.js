const OpenAI = require('openai');
const { config } = require('../config/config');
const { formatForWhatsApp } = require('../utils/formatter');
const logger = require('../utils/logger');

let client = null;

function getOpenAIClient() {
  if (!client) {
    if (!config.openai.apiKey) {
      logger.warn(
        'OPENAI_API_KEY is not set. AI requests will fail until an API key is provided in .env'
      );
    }
    client = new OpenAI({
      apiKey: config.openai.apiKey || 'missing-key',
      baseURL: config.openai.baseURL,
      timeout: 30000, // 30 seconds timeout
    });
  }
  return client;
}

const SYSTEM_PROMPT = `You are a text-based AI assistant integrated directly into WhatsApp.
Your primary role is to provide quick, insightful, and accurate answers directly in the chat.

Strict Formatting & Layout Guidelines:
1. Conciseness: Keep your answers brief and focused (strictly under 2-3 short paragraphs).
2. Bullet Points: Use punchy, clean bullet points where appropriate to make information easily scannable on mobile screens.
3. WhatsApp Markdown:
   - Use *bold* for emphasis (single asterisks).
   - Use _italics_ for terms, titles, or secondary notes.
   - Use ~strikethrough~ where necessary.
   - Use \`\`\`monospace\`\`\` only for actual code snippets or commands.
   - DO NOT use markdown headers (e.g., ### or ##). Instead, use *Bold Section Titles*.
   - DO NOT wrap regular text, paragraphs, or lists inside markdown code blocks.
4. Tone: Helpful, direct, polite, and professional. Avoid filler, fluff, or excessive pleasantries.`;

/**
 * Generate an AI completion for the incoming user message
 * @param {string} userPrompt - The cleaned prompt from the WhatsApp user
 * @param {object} [metadata] - Optional metadata (sender ID, name, etc.)
 * @returns {Promise<string>} - Formatted response ready to be sent via WhatsApp
 */
async function generateAIResponse(userPrompt, metadata = {}) {
  try {
    const openai = getOpenAIClient();

    logger.info(`Sending prompt to AI model [${config.openai.model}] (Prompt length: ${userPrompt.length} chars)`);

    const completion = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const rawResponse = completion.choices?.[0]?.message?.content || '';
    if (!rawResponse.trim()) {
      return "I processed your request, but received an empty response. Please rephrase or try again.";
    }

    // Apply WhatsApp markdown compliance and formatting
    const formattedResponse = formatForWhatsApp(rawResponse);
    return formattedResponse;
  } catch (error) {
    logger.error('Failed to generate AI response from LLM endpoint:', error);

    // Polite, generic failure notice sent to the WhatsApp user without crashing the script
    if (error.code === 'ETIMEDOUT' || error.status === 408) {
      return "⏱️ *Notice:* The AI service took too long to respond. Please try again in a few moments.";
    }

    if (error.status === 401) {
      return "⚠️ *Configuration Error:* The AI API key appears to be invalid or unauthorized. Please verify the `.env` settings.";
    }

    if (error.status === 429) {
      return "⚠️ *Notice:* The AI service is currently receiving high demand or rate limits were reached. Please retry shortly.";
    }

    return "⚠️ *Notice:* I'm sorry, I encountered an unexpected issue while processing your request. Please try again in a moment.";
  }
}

module.exports = {
  generateAIResponse,
  SYSTEM_PROMPT,
};
