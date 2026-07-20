const { GoogleGenerativeAI } = require('@google/generative-ai');
const supabase = require('../../config/supabase');
const { getNvidiaEmbedding } = require('../../utils/nvidiaEmbeddings');

// ── Vercel serverless config ──────────────────────────────────────────────────
const config = { maxDuration: 60 };

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const NVIDIA_CHAT_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_MODELS = [
  'meta/llama-3.3-70b-instruct',
  'nvidia/llama-3.1-nemotron-70b-instruct',
  'meta/llama-3.1-70b-instruct',
  'mistralai/mistral-7b-instruct-v0.3',
];

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
4. Always cite the source(s) you used, referencing the [Source N] labels in your answer text (e.g. "[Source 1]").
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

// ── Non-streaming NVIDIA completion (works on Vercel serverless) ──────────────
async function callNvidiaChat(systemPrompt, userMessage) {
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
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userMessage },
          ],
          temperature: 0.6,
          top_p: 0.9,
          max_tokens: 1024,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`NVIDIA model ${model} HTTP ${response.status}:`, errText.slice(0, 200));
        continue;
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text) {
        console.log(`NVIDIA model ${model} responded successfully`);
        return text;
      }
    } catch (err) {
      console.warn(`NVIDIA model ${model} error:`, err.message);
    }
  }

  return null;
}

// ── Gemini completion (fallback) ──────────────────────────────────────────────
async function callGeminiChat(systemPrompt, userMessage) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const GEMINI_MODELS = [
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-pro',
  ];

  for (const modelName of GEMINI_MODELS) {
    try {
      const chatModel = genAI.getGenerativeModel({ model: modelName });
      const result = await chatModel.generateContent([
        { text: systemPrompt },
        { text: `User question: ${userMessage}` },
      ]);
      const text = result?.response?.text?.();
      if (text) {
        console.log(`Gemini model ${modelName} responded successfully`);
        return text;
      }
    } catch (err) {
      const errMsg = err?.message || String(err);
      console.warn(`Gemini model ${modelName} error:`, errMsg.slice(0, 200));
      // If it's a quota/rate-limit issue, stop trying other models
      if (errMsg.includes('429') || errMsg.includes('quota')) break;
    }
  }

  return null;
}

// ── Main API handler ──────────────────────────────────────────────────────────
async function handler(req, res) {
  // CORS headers
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

  const hasNvidia = Boolean(process.env.NVIDIA_API_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);

  if (!hasNvidia && !hasGemini) {
    return res.status(503).json({
      error: 'Chat service is not configured. Please add GEMINI_API_KEY or NVIDIA_API_KEY in your Vercel Environment Variables.',
    });
  }

  const trimmedMsg = message.trim();
  const isGreetingOrGeneral = /^(hello|hi|hey|jambo|habari|greetings|good\s*(morning|afternoon|evening)|thank\s*you|thanks|who\s*are\s*you|what\s*can\s*you\s*do|mambo)/i.test(trimmedMsg);

  try {
    // ── 1. Embed & vector search ──────────────────────────────────────────
    let chunks = [];
    let dbSuccess = false;

    try {
      const queryEmbedding = await getNvidiaEmbedding(trimmedMsg, 'query');
      const { data, error: dbError } = await supabase.rpc('match_bonga_documents', {
        query_embedding: queryEmbedding,
        match_threshold:  0.35,
        match_count:      6,
        filter_pillar:    pillar || null,
      });
      if (!dbError && data) {
        chunks = data;
        dbSuccess = true;
      } else {
        console.warn('Supabase RPC error:', dbError?.message);
      }
    } catch (dbErr) {
      console.warn('Embedding / Supabase RPC exception:', dbErr.message);
    }

    // ── 2. Build prompt ───────────────────────────────────────────────────
    const hasKnowledgeBase = dbSuccess && chunks.length > 0;
    const systemPrompt = (hasKnowledgeBase && !isGreetingOrGeneral)
      ? buildSystemPrompt(chunks)
      : buildGeneralPrompt();

    // ── 3. Generate response (NVIDIA → Gemini fallback) ───────────────────
    let responseText = null;

    if (hasNvidia) {
      responseText = await callNvidiaChat(systemPrompt, trimmedMsg);
    }

    if (!responseText && hasGemini) {
      responseText = await callGeminiChat(systemPrompt, trimmedMsg);
    }

    if (!responseText) {
      return res.status(503).json({
        error: 'Bonga na Vybe is currently unavailable. Please try again in a few moments.',
      });
    }

    // ── 4. Build sources ──────────────────────────────────────────────────
    const sources = (hasKnowledgeBase && !isGreetingOrGeneral)
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

  } catch (err) {
    console.error('Chat API error:', err);
    return res.status(500).json({ error: err.message || 'Something went wrong.' });
  }
}

handler.config = config;
module.exports = handler;
