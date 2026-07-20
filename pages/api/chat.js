const { GoogleGenerativeAI } = require('@google/generative-ai');
const supabase = require('../../config/supabase');
const { getNvidiaEmbedding } = require('../../utils/nvidiaEmbeddings');
const { streamNvidiaChat } = require('../../utils/nvidiaChat');

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

async function handler(req, res) {
  // Allow CORS for production access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { message, pillar = null } = req.body || {};

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  if (!process.env.NVIDIA_API_KEY && !process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: 'Chat service API key not configured. Please add GEMINI_API_KEY or NVIDIA_API_KEY to your Vercel Environment Variables.',
    });
  }

  // Set headers for Server-Sent Events (SSE) streaming
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const trimmedMsg = message.trim();
  const isGreetingOrGeneral = /^(hello|hi|hey|jambo|habari|greetings|good\s*(morning|afternoon|evening)|thank\s*you|thanks|who\s*are\s*you|what\s*can\s*you\s*do|mambo)/i.test(trimmedMsg);

  try {
    let chunks = [];
    let dbSuccess = false;

    // ── 1. Embed and query vector DB ───────────────────────────────────
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

    // ── 3. Try Streaming with NVIDIA API First ──────────────────────────
    let nvidiaSuccess = false;
    if (process.env.NVIDIA_API_KEY) {
      console.log('Attempting chat completion via NVIDIA API...');
      nvidiaSuccess = await streamNvidiaChat(systemPrompt, trimmedMsg, (chunkText) => {
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      });
    }

    // ── 4. Fallback to Gemini API if NVIDIA is not configured or failed ─
    if (!nvidiaSuccess && process.env.GEMINI_API_KEY) {
      console.log('NVIDIA API unavailable or failed, falling back to Gemini API...');
      const MODELS_TO_TRY = ['gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
      let resultStream = null;
      let modelError = null;

      for (const modelName of MODELS_TO_TRY) {
        try {
          const chatModel = genAI.getGenerativeModel({ model: modelName });
          resultStream = await chatModel.generateContentStream([
            { text: systemPrompt },
            { text: `User question: ${trimmedMsg}` },
          ]);
          if (resultStream) break;
        } catch (err) {
          console.warn(`Gemini model ${modelName} error:`, err?.message || err);
          modelError = err;
        }
      }

      if (resultStream) {
        for await (const chunk of resultStream.stream) {
          const chunkText = chunk.text();
          res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
        }
        nvidiaSuccess = true;
      } else {
        const quotaMsg = (modelError?.message?.includes('429') || modelError?.message?.includes('quota'))
          ? "Bonga na Vybe is currently experiencing high demand. Please try again in a few seconds."
          : (modelError?.message || "Something went wrong generating a response.");
        res.write(`data: ${JSON.stringify({ text: quotaMsg })}\n\n`);
        res.write(`data: ${JSON.stringify({ sources: [] })}\n\n`);
        res.end();
        return;
      }
    }

    if (!nvidiaSuccess) {
      res.write(`data: ${JSON.stringify({ text: "Unable to generate response. Please check server API key configuration." })}\n\n`);
      res.write(`data: ${JSON.stringify({ sources: [] })}\n\n`);
      res.end();
      return;
    }

    // ── 5. Format sources if RAG was used ──────────────────────────────
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

    res.write(`data: ${JSON.stringify({ sources })}\n\n`);
    res.end();

  } catch (err) {
    console.error('Chat API stream error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message || 'Something went wrong.' })}\n\n`);
    res.end();
  }
}

handler.config = {
  maxDuration: 60,
};

module.exports = handler;
