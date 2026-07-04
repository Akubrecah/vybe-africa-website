/**
 * routes/chat.js
 * POST /api/chat
 *
 * RAG pipeline:
 *  1. Embed user message with Gemini text-embedding-004
 *  2. Retrieve top-k matching chunks from Supabase pgvector
 *  3. Build strict system prompt with retrieved context
 *  4. Generate answer with Gemini 1.5 Flash
 *  5. Return { answer, sources[] }
 */

const express = require('express');
const router  = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const supabase = require('../config/supabase');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Pillar display names
const PILLAR_LABELS = {
  srhr:             'SRHR & Maternal Health',
  climate:          'Climate Action & Eco',
  child_protection: 'Child Protection',
  governance:       'Inclusive Governance',
};

// System prompt template — strict RAG guardrails
function buildSystemPrompt(contextChunks) {
  const context = contextChunks
    .map((c, i) => `[Source ${i + 1}] (${c.source_name}, ${PILLAR_LABELS[c.pillar] || c.pillar})\n${c.content}`)
    .join('\n\n---\n\n');

  return `You are "Bonga na Vybe" — an AI assistant for Vybe Africa, a youth-led organisation in West Pokot, Kenya.

STRICT RULES:
1. Answer ONLY using the provided context below. Do NOT use outside knowledge.
2. If the question is not related to Vybe Africa's four pillars (SRHR & Health, Climate Action, Child Protection, Inclusive Governance), respond: "Samahani! I can only answer questions about Vybe Africa's four pillars. Please ask me about SRHR, climate action, child protection, or inclusive governance."
3. Always cite the source(s) you used, referencing the [Source N] labels.
4. Keep answers concise, warm, and youth-friendly.
5. If the context does not contain enough information, say so honestly — do not guess.
6. Respond in the same language the user writes in (English or Swahili).

CONTEXT:
${context}

Answer the user's question based strictly on the context above.`;
}

// POST /api/chat
router.post('/', async (req, res) => {
  const { message, pillar = null } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: 'Gemini API key not configured. Add GEMINI_API_KEY to your .env file.',
    });
  }

  try {
    // ── 1. Embed the user's question ────────────────────────────────────
    console.log('Step 1: Attempting to embed message:', message.trim().substring(0, 50));
    const embeddingModel = genAI.getGenerativeModel({ model: 'models/gemini-embedding-001' });
    const embeddingResult = await embeddingModel.embedContent(message.trim());
    const queryEmbedding   = embeddingResult.embedding.values;
    console.log('Step 1 success: Embedding dimensions =', queryEmbedding?.length);

    // ── 2. Retrieve relevant chunks from Supabase ───────────────────────
    console.log('Step 2: Querying Supabase...');
    const { data: chunks, error: dbError } = await supabase.rpc(
      'match_bonga_documents',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.45,
        match_count:     6,
        filter_pillar:   pillar,   // null = search all pillars
      }
    );

    if (dbError) {
      console.error('Step 2 error - Supabase RPC error:', dbError);
      return res.status(500).json({ error: 'Knowledge base lookup failed: ' + dbError.message });
    }
    console.log('Step 2 success: Found', chunks?.length || 0, 'chunks');

    // ── 3. Build prompt ─────────────────────────────────────────────────
    console.log('Step 3: Building system prompt...');
    const systemPrompt = buildSystemPrompt(chunks || []);
    const chatModel    = genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash' });
    console.log('Step 3 success: System prompt built');

    console.log('Step 4: Calling Gemini API...');
    const result = await chatModel.generateContent([
      { text: systemPrompt },
      { text: `User question: ${message.trim()}` },
    ]);

    const answer = result.response.text();
    console.log('Step 4 success: Got response from Gemini');

    // ── 4. Deduplicate + format sources ─────────────────────────────────
    const sources = (chunks || [])
      .filter((c, i, arr) => arr.findIndex(x => x.source_url === c.source_url) === i)
      .map(c => ({
        name:   c.source_name,
        url:    c.source_url,
        pillar: PILLAR_LABELS[c.pillar] || c.pillar,
        title:  c.title,
      }));

    return res.json({ answer, sources });

  } catch (err) {
    console.error('Chat route error:', err.message || err);
    console.error('Full error object:', err);
    return res.status(500).json({ error: err.message || 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
