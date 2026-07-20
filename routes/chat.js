/**
 * routes/chat.js
 * POST /api/chat
 *
 * RAG pipeline:
 *  1. Embed user message with NVIDIA embeddings (nvidia/llama-nemotron-embed-1b-v2)
 *  2. Retrieve top-k matching chunks from Supabase pgvector
 *  3. Build system prompt as "Bonga na Vybe"
 *  4. Generate answer with NVIDIA Chat API (meta/llama-3.3-70b-instruct) with Gemini fallback
 *  5. Return { answer, sources[] }
 */

const express = require('express');
const router  = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const supabase = require('../config/supabase');
const { getNvidiaEmbedding } = require('../utils/nvidiaEmbeddings');
const { generateNvidiaChat } = require('../utils/nvidiaChat');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');

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

// POST /api/chat
router.post('/', async (req, res) => {
  const { message, pillar = null } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  if (!process.env.NVIDIA_API_KEY && !process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: 'API key not configured. Add NVIDIA_API_KEY or GEMINI_API_KEY to your .env file.',
    });
  }

  const trimmedMsg = message.trim();
  const isGreetingOrGeneral = /^(hello|hi|hey|jambo|habari|greetings|good\s*(morning|afternoon|evening)|thank\s*you|thanks|who\s*are\s*you|what\s*can\s*you\s*do|mambo)/i.test(trimmedMsg);

  try {
    let chunks = [];
    let dbSuccess = false;

    // ── 1. Embed and query vector DB with NVIDIA API ───────────────────
    try {
      const queryEmbedding = await getNvidiaEmbedding(trimmedMsg, 'query');

      const { data, error: dbError } = await supabase.rpc(
        'match_bonga_documents',
        {
          query_embedding: queryEmbedding,
          match_threshold: 0.35,
          match_count:     6,
          filter_pillar:   pillar || null,
        }
      );
      if (!dbError && data) {
        chunks = data;
        dbSuccess = true;
      } else {
        console.warn('Supabase RPC error:', dbError?.message);
      }
    } catch (dbErr) {
      console.warn('Embedding / Supabase RPC exception:', dbErr.message);
    }

    // ── 2. Determine Prompt ─────────────────────────────────────────────
    const hasKnowledgeBase = dbSuccess && chunks.length > 0;
    const systemPrompt = (hasKnowledgeBase && !isGreetingOrGeneral)
      ? buildSystemPrompt(chunks)
      : buildGeneralPrompt();

    // ── 3. Generate Answer with NVIDIA Chat API ────────────────────────
    let answer = null;
    if (process.env.NVIDIA_API_KEY) {
      console.log('Generating response via NVIDIA API...');
      answer = await generateNvidiaChat(systemPrompt, trimmedMsg);
    }

    // ── 4. Fallback to Gemini API if NVIDIA is unavailable or failed ───
    if (!answer) {
      console.log('NVIDIA API unavailable or failed, falling back to Gemini API...');
      const MODELS_TO_TRY = ['gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
      let modelError = null;

      for (const modelName of MODELS_TO_TRY) {
        try {
          const chatModel = genAI.getGenerativeModel({ model: modelName });
          const result = await chatModel.generateContent([
            { text: systemPrompt },
            { text: `User question: ${trimmedMsg}` },
          ]);
          if (result) {
            answer = result.response.text();
            break;
          }
        } catch (err) {
          console.warn(`Gemini model ${modelName} error:`, err?.message || err);
          modelError = err;
        }
      }

      if (!answer) {
        const quotaMsg = (modelError?.message?.includes('429') || modelError?.message?.includes('quota'))
          ? "Bonga na Vybe is currently experiencing high demand. Please try again in a few seconds."
          : (modelError?.message || "Something went wrong generating a response.");
        return res.status(429).json({ error: quotaMsg, sources: [] });
      }
    }

    // ── 5. Format sources ───────────────────────────────────────────────
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

    return res.json({ answer, sources });

  } catch (err) {
    console.error('Chat route error:', err.message || err);
    return res.status(500).json({ error: err.message || 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
