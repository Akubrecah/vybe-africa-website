const { GoogleGenerativeAI } = require('@google/generative-ai');
const supabase = require('../../config/supabase');
const { getNvidiaEmbedding } = require('../../utils/nvidiaEmbeddings');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
1. Answer ONLY using the provided context below. Do NOT use outside knowledge.
2. If the user asks for emergency helplines, support numbers, or contacts, you MUST share these:
   - Aunty Jane (SRHR & Health): 0800721530 (Toll-Free) or WhatsApp 0727101919
   - GBV Helpline: 1195 (Toll-Free, 24/7)
   - Child Helpline: 116 (Toll-Free, 24/7)
3. If the question is not related to Vybe Africa's four pillars (SRHR & Health, Climate Action, Child Protection, Inclusive Governance) and does not ask for contact/support help, respond: "Samahani! I can only answer questions about Vybe Africa's four pillars. Please ask me about SRHR, climate action, child protection, or inclusive governance."
4. Always cite the source(s) you used, referencing the [Source N] labels in your answer text (e.g. "[Source 1]").
5. Keep answers concise, warm, and youth-friendly.
6. If the context does not contain enough information to answer the question, say: "Samahani! I cannot find this information in my knowledge base. Please ask about SRHR, climate action, child protection, or inclusive governance."
7. Respond in the same language the user writes in (English or Swahili).

CONTEXT:
${context}

Answer the user's question based strictly on the context above.`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { message, pillar = null } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: 'Gemini API key not configured. Add GEMINI_API_KEY to your .env file.',
    });
  }

  // Set headers for Server-Sent Events (SSE) streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  try {
    // ── 1. Embed the user's question with NVIDIA API ─────────────────────
    const queryEmbedding = await getNvidiaEmbedding(message.trim(), 'query');

    // ── 2. Retrieve relevant chunks from Supabase ───────────────────────
    let chunks = [];
    let dbSuccess = false;

    try {
      const { data, error: dbError } = await supabase.rpc(
        'match_bonga_documents',
        {
          query_embedding: queryEmbedding,
          match_threshold: 0.40, // Slightly lower threshold for higher match likelihood
          match_count:     6,
          filter_pillar:   pillar || null, // null matches all pillars
        }
      );
      if (!dbError && data) {
        chunks = data;
        dbSuccess = true;
      } else {
        console.warn('Supabase RPC error:', dbError?.message);
      }
    } catch (dbErr) {
      console.warn('Supabase RPC exception:', dbErr.message);
    }

    // ── 3. Strict Check: If no information retrieved, say so ───────────
    if (!dbSuccess || chunks.length === 0) {
      const fallbackText = "Samahani! I cannot find any relevant information in my knowledge base to answer your question. Please ask me about SRHR, climate action, child protection, or inclusive governance.";
      res.write(`data: ${JSON.stringify({ text: fallbackText })}\n\n`);
      res.write(`data: ${JSON.stringify({ sources: [] })}\n\n`);
      res.end();
      return;
    }

    // ── 4. Build prompt and Stream response ─────────────────────────────
    const systemPrompt = buildSystemPrompt(chunks);
    const chatModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const resultStream = await chatModel.generateContentStream([
      { text: systemPrompt },
      { text: `User question: ${message.trim()}` },
    ]);

    for await (const chunk of resultStream.stream) {
      const chunkText = chunk.text();
      res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
    }

    // ── 5. Deduplicate + format sources and send at the end ─────────────
    const sources = chunks
      .filter((c, i, arr) => arr.findIndex(x => x.source_url === c.source_url) === i)
      .map(c => ({
        name:   c.source_name,
        url:    c.source_url,
        pillar: PILLAR_LABELS[c.pillar] || c.pillar,
        title:  c.title,
      }));

    res.write(`data: ${JSON.stringify({ sources })}\n\n`);
    res.end();

  } catch (err) {
    console.error('Chat API stream error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message || 'Something went wrong.' })}\n\n`);
    res.end();
  }
}
