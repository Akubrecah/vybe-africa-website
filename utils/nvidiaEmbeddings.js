const { GoogleGenerativeAI } = require('@google/generative-ai');

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Generates 768-dimensional text embeddings using the NVIDIA NIM API with Gemini fallback.
 * Uses the Matryoshka-capable model: nvidia/llama-nemotron-embed-1b-v2 (or gemini-embedding-001)
 * 
 * @param {string} text - The input text to embed
 * @param {'passage'|'query'} type - The type of input ('passage' for indexing, 'query' for searching)
 * @param {number} retries - Number of retry attempts for network failures
 * @param {number} delay - Base delay for exponential backoff in milliseconds
 * @returns {Promise<number[]>} Embedding array of 768 float elements
 */
async function getNvidiaEmbedding(text, type = 'passage', retries = 2, delay = 500) {
  const apiKey = process.env.NVIDIA_API_KEY;
  
  if (apiKey) {
    const url = 'https://integrate.api.nvidia.com/v1/embeddings';

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            input: [text],
            model: 'nvidia/llama-nemotron-embed-1b-v2',
            input_type: type,
            dimensions: 768,
            encoding_format: 'float',
            truncate: 'NONE'
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.data && data.data[0] && data.data[0].embedding) {
            return data.data[0].embedding;
          }
        }
      } catch (err) {
        console.warn(`NVIDIA embedding query attempt ${attempt} failed: ${err.message}`);
        if (attempt < retries) await sleep(delay * attempt);
      }
    }
  }

  // Fallback to Gemini embedding if NVIDIA API key is not present or query failed
  if (process.env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
      const embeddingResult = await embeddingModel.embedContent({
        content: { parts: [{ text: text.trim() }] },
        outputDimensionality: 768
      });
      if (embeddingResult?.embedding?.values) {
        return embeddingResult.embedding.values;
      }
    } catch (gErr) {
      console.warn('Gemini embedding fallback failed:', gErr.message || gErr);
    }
  }

  throw new Error('Embedding service unavailable. Please configure NVIDIA_API_KEY or GEMINI_API_KEY.');
}

module.exports = { getNvidiaEmbedding };
