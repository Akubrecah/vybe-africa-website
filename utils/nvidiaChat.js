/**
 * utils/nvidiaChat.js
 * NVIDIA NIM Chat Completion Client (OpenAI-compatible)
 *
 * Supports models like:
 * - meta/llama-3.3-70b-instruct
 * - nvidia/llama-3.1-nemotron-70b-instruct
 * - meta/llama-3.1-70b-instruct
 * - mistralai/mistral-7b-instruct-v0.3
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const NVIDIA_CHAT_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_MODELS = [
  'meta/llama-3.3-70b-instruct',
  'nvidia/llama-3.1-nemotron-70b-instruct',
  'meta/llama-3.1-70b-instruct',
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Stream NVIDIA Chat Completion (SSE)
 * @param {string} systemPrompt 
 * @param {string} userMessage 
 * @param {function(string):void} onChunk 
 * @returns {Promise<boolean>} True if succeeded, false if failed
 */
async function streamNvidiaChat(systemPrompt, userMessage, onChunk) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return false;

  for (const model of NVIDIA_MODELS) {
    try {
      const response = await fetch(NVIDIA_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.5,
          top_p: 0.9,
          max_tokens: 1024,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`NVIDIA chat model ${model} HTTP ${response.status}: ${errText}`);
        continue;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              // Ignore parse errors on partial lines
            }
          }
        }
      }

      return true; // Successfully completed streaming
    } catch (err) {
      console.warn(`NVIDIA chat model ${model} stream error:`, err.message || err);
    }
  }

  return false; // All NVIDIA models failed
}

/**
 * Non-Streaming NVIDIA Chat Completion
 * @param {string} systemPrompt 
 * @param {string} userMessage 
 * @returns {Promise<string|null>} Response text or null if failed
 */
async function generateNvidiaChat(systemPrompt, userMessage) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return null;

  for (const model of NVIDIA_MODELS) {
    try {
      const response = await fetch(NVIDIA_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.5,
          top_p: 0.9,
          max_tokens: 1024,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`NVIDIA chat model ${model} HTTP ${response.status}: ${errText}`);
        continue;
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) return text;
    } catch (err) {
      console.warn(`NVIDIA chat model ${model} error:`, err.message || err);
    }
  }

  return null;
}

module.exports = { streamNvidiaChat, generateNvidiaChat };
