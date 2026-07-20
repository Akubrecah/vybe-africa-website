const supabase = require('../../config/supabase');
const { getNvidiaEmbedding } = require('../../utils/nvidiaEmbeddings');

// ── Vercel serverless config ──────────────────────────────────────────────────
const config = { maxDuration: 60 };

const NVIDIA_CHAT_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

// Ordered by speed: fast small models first, large as last resort
const NVIDIA_MODELS = [
  { model: 'mistralai/mistral-7b-instruct-v0.3', timeout: 15000 },
  { model: 'meta/llama-3.1-8b-instruct',         timeout: 15000 },
  { model: 'meta/llama-3.3-70b-instruct',         timeout: 45000 },
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

RULES:
1. Answer using the provided context below.
2. For emergency helplines always share:
   - Aunty Jane (SRHR): 0800721530 (Toll-Free) or WhatsApp 0727101919
   - GBV Helpline: 1195 (Toll-Free, 24/7)
   - Child Helpline: 116 (Toll-Free, 24/7)
3. Keep answers concise, warm, and youth-friendly.
4. Cite sources using [Source N] notation.
5. Reply in the same language as the user (English or Swahili).

CONTEXT:
${context}`;
}

function buildGeneralPrompt() {
  return `You are "Bonga na Vybe" — a warm, friendly AI assistant for Vybe Africa, a youth-led organisation in West Pokot, Kenya.

Greet the user warmly (Jambo! / Habari! / Hello!) and introduce yourself.
You help with Vybe Africa's four pillars:
- 💊 SRHR & Maternal Health
- 🌱 Climate Action & Eco
- 🛡 Child Protection
- 🏛 Inclusive Governance

Emergency Helplines:
- Aunty Jane (SRHR): 0800721530 (Toll-Free) or WhatsApp 0727101919
- GBV Helpline: 1195 (24/7)
- Child Helpline: 116 (24/7)

Respond in the same language as the user (English or Swahili). Keep answers concise.`;
}

// ── NVIDIA Chat (tries fast models first) ─────────────────────────────────────
async function callNvidia(systemPrompt, userMessage) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return null;

  for (const { model, timeout } of NVIDIA_MODELS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(NVIDIA_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept':        'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userMessage },
          ],
          temperature: 0.6,
          top_p:       0.9,
          max_tokens:  600,
          stream:      false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[NVIDIA] ${model} HTTP ${response.status}:`, errText.slice(0, 120));
        continue; // try next model
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text) {
        console.log(`[NVIDIA] ${model} ✓`);
        return text;
      }
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        console.warn(`[NVIDIA] ${model} timed out after ${timeout}ms, trying next...`);
      } else {
        console.warn(`[NVIDIA] ${model} error:`, err.message?.slice(0, 120));
      }
      // continue to next model
    }
  }

  return null; // all models failed
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

  if (!process.env.NVIDIA_API_KEY) {
    return res.status(503).json({
      error: 'Chat service not configured. Add NVIDIA_API_KEY to your Vercel Environment Variables.',
    });
  }

  const trimmedMsg = message.trim();
  const isGreeting = /^(hello|hi|hey|jambo|habari|greetings|good\s*(morning|afternoon|evening)|thank\s*you|thanks|who\s*are\s*you|what\s*can\s*you\s*do|mambo)/i.test(trimmedMsg);

  // ── 1. Embed & vector search ────────────────────────────────────────────────
  let chunks = [];
  try {
    const embedding = await getNvidiaEmbedding(trimmedMsg, 'query');
    const { data, error: dbError } = await supabase.rpc('match_bonga_documents', {
      query_embedding:  embedding,
      match_threshold:  0.35,
      match_count:      5,
      filter_pillar:    pillar || null,
    });
    if (!dbError && data?.length > 0) {
      chunks = data;
    } else if (dbError) {
      console.warn('[embed] Supabase error:', dbError?.message);
    }
  } catch (err) {
    console.warn('[embed] Error:', err.message);
  }

  // ── 2. Build prompt ─────────────────────────────────────────────────────────
  const hasContext  = chunks.length > 0;
  const systemPrompt = (hasContext && !isGreeting)
    ? buildSystemPrompt(chunks)
    : buildGeneralPrompt();

  // ── 3. Call NVIDIA ──────────────────────────────────────────────────────────
  const responseText = await callNvidia(systemPrompt, trimmedMsg);

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

module.exports = handler;
module.exports.default = handler;
module.exports.config = config;
