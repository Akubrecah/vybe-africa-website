const { GoogleGenerativeAI } = require('@google/generative-ai');
const supabase = require('../../config/supabase');
const { getNvidiaEmbedding } = require('../../utils/nvidiaEmbeddings');

// ── Vercel serverless config ──────────────────────────────────────────────────
const config = { maxDuration: 60 };

const NVIDIA_CHAT_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
// Only use the most reliable fast NVIDIA model (skip slow/unavailable ones)
const NVIDIA_MODEL = 'meta/llama-3.3-70b-instruct';
const NVIDIA_TIMEOUT_MS = 12000; // 12s hard timeout for NVIDIA

const PILLAR_LABELS = {
  srhr:             'SRHR & Maternal Health',
  climate:          'Climate Action & Eco',
  child_protection: 'Child Protection',
  governance:       'Inclusive Governance',
};

function buildSystemPrompt(contextChunks) {
  const context = contextChunks
    .map((c, i) => `[Source ${i + 1}] (${c.source_name}, ${PILLAR_LABELS[c.pillar] || c.pillar})\n${c.content}`)
    .join('\n\n---\n\n');

  return `You are "Bonga na Vybe" — an AI assistant for Vybe Africa, a youth-led organisation in West Pokot, Kenya.

STRICT RULES:
1. Answer using the provided context below as much as possible.
2. If the user asks for emergency helplines, support numbers, or contacts, you MUST share these:
   - Aunty Jane (SRHR & Health): 0800721530 (Toll-Free) or WhatsApp 0727101919
   - GBV Helpline: 1195 (Toll-Free, 24/7)
   - Child Helpline: 116 (Toll-Free, 24/7)
3. Keep answers concise, warm, engaging, and youth-friendly.
4. Always cite the source(s) you used, referencing the [Source N] labels in your answer text.
5. Respond in the same language the user writes in (English or Swahili).

CONTEXT:
${context}

Answer the user's question based on the context above.`;
}

function buildGeneralPrompt() {
  return `You are "Bonga na Vybe" — a warm, supportive, and friendly AI assistant for Vybe Africa, a youth-led organisation in West Pokot, Kenya.

Keep your answers engaging, youth-friendly, and concise.
If the user greets you or asks who you are, greet them warmly (e.g. "Jambo!", "Habari!", "Hello!") and introduce yourself as Bonga na Vybe.
Let the user know you are here to assist with questions on Vybe Africa's four pillars:
- 💊 SRHR & Maternal Health
- 🌱 Climate Action & Eco
- 🛡 Child Protection
- 🏛 Inclusive Governance

Emergency Helplines (share if relevant):
- Aunty Jane (SRHR & Health): 0800721530 (Toll-Free) or WhatsApp 0727101919
- GBV Helpline: 1195 (Toll-Free, 24/7)
- Child Helpline: 116 (Toll-Free, 24/7)

Respond warmly in the same language the user writes in (English or Swahili).`;
}

// ── Gemini (PRIMARY — fast, ~2-3s) ───────────────────────────────────────────
async function callGemini(systemPrompt, userMessage) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const genAI = new GoogleGenerativeAI(apiKey);
  const MODELS = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash'];

  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([
        { text: systemPrompt },
        { text: `User: ${userMessage}` },
      ]);
      const text = result?.response?.text?.();
      if (text) {
        console.log(`[chat] Gemini (${modelName}) ✓`);
        return text;
      }
    } catch (err) {
      const msg = err?.message || String(err);
      console.warn(`[chat] Gemini (${modelName}) ✗:`, msg.slice(0, 120));
      // Stop retrying on quota error
      if (msg.includes('429') || msg.includes('quota')) break;
    }
  }

  return null;
}

// ── NVIDIA (FALLBACK — slower, with hard timeout) ─────────────────────────────
async function callNvidia(systemPrompt, userMessage) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NVIDIA_TIMEOUT_MS);

  try {
    const response = await fetch(NVIDIA_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMessage },
        ],
        temperature: 0.6,
        top_p: 0.9,
        max_tokens: 512,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[chat] NVIDIA HTTP ${response.status}:`, errText.slice(0, 150));
      return null;
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (text) {
      console.log(`[chat] NVIDIA (${NVIDIA_MODEL}) ✓`);
      return text;
    }
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      console.warn(`[chat] NVIDIA timed out after ${NVIDIA_TIMEOUT_MS}ms`);
    } else {
      console.warn('[chat] NVIDIA error:', err.message?.slice(0, 120));
    }
  }

  return null;
}

// ── Main API handler ──────────────────────────────────────────────────────────
async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { message, pillar = null } = req.body || {};

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasNvidia = Boolean(process.env.NVIDIA_API_KEY);

  if (!hasGemini && !hasNvidia) {
    return res.status(503).json({
      error: 'Chat service is not configured. Add GEMINI_API_KEY to your Vercel Environment Variables.',
    });
  }

  const trimmedMsg = message.trim();
  const isGreeting = /^(hello|hi|hey|jambo|habari|greetings|good\s*(morning|afternoon|evening)|thank\s*you|thanks|who\s*are\s*you|what\s*can\s*you\s*do|mambo)/i.test(trimmedMsg);

  // ── 1. Embed & vector search ────────────────────────────────────────────────
  let chunks = [];
  try {
    const queryEmbedding = await getNvidiaEmbedding(trimmedMsg, 'query');
    const { data, error: dbError } = await supabase.rpc('match_bonga_documents', {
      query_embedding: queryEmbedding,
      match_threshold:  0.35,
      match_count:      6,
      filter_pillar:    pillar || null,
    });
    if (!dbError && data?.length > 0) {
      chunks = data;
    } else if (dbError) {
      console.warn('[chat] Supabase RPC error:', dbError?.message);
    }
  } catch (dbErr) {
    console.warn('[chat] Embedding error:', dbErr.message);
  }

  // ── 2. Build prompt ─────────────────────────────────────────────────────────
  const hasContext = chunks.length > 0;
  const systemPrompt = (hasContext && !isGreeting)
    ? buildSystemPrompt(chunks)
    : buildGeneralPrompt();

  // ── 3. Call AI (Gemini first → NVIDIA fallback) ─────────────────────────────
  let responseText = null;

  // Try Gemini first (fast: ~2-3s)
  if (hasGemini) {
    responseText = await callGemini(systemPrompt, trimmedMsg);
  }

  // Fallback to NVIDIA if Gemini unavailable or failed
  if (!responseText && hasNvidia) {
    responseText = await callNvidia(systemPrompt, trimmedMsg);
  }

  if (!responseText) {
    return res.status(503).json({
      error: 'Bonga na Vybe is temporarily unavailable. Please try again in a moment.',
    });
  }

  // ── 4. Build sources ────────────────────────────────────────────────────────
  const sources = (hasContext && !isGreeting)
    ? chunks
        .filter((c, i, arr) => arr.findIndex(x => x.source_url === c.source_url) === i)
        .map(c => ({
          name:   c.source_name,
          url:    c.source_url,
          pillar: PILLAR_LABELS[c.pillar] || c.pillar,
          title:  c.title,
        }))
    : [];

  return res.status(200).json({ text: responseText, sources });
}

handler.config = config;
module.exports = handler;
