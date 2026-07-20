const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Generates 768-dimensional text embeddings using the NVIDIA NIM API.
 * Uses the Matryoshka-capable model: nvidia/llama-nemotron-embed-1b-v2
 * 
 * @param {string} text - The input text to embed
 * @param {'passage'|'query'} type - The type of input ('passage' for indexing, 'query' for searching)
 * @param {number} retries - Number of retry attempts for network failures
 * @param {number} delay - Base delay for exponential backoff in milliseconds
 * @returns {Promise<number[]>} Embedding array of 768 float elements
 */
async function getNvidiaEmbedding(text, type = 'passage', retries = 3, delay = 1000) {
  const apiKey = process.env.NVIDIA_API_KEY;
  
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY is not configured in your environment (.env file). Please obtain an API key from the NVIDIA API Catalog and configure it.');
  }

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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`NVIDIA API returned HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (!data || !data.data || !data.data[0] || !data.data[0].embedding) {
        throw new Error('Unexpected response format from NVIDIA embeddings API.');
      }

      return data.data[0].embedding;
    } catch (err) {
      console.warn(`NVIDIA embedding query attempt ${attempt} failed: ${err.message}`);
      if (attempt === retries) throw err;
      await sleep(delay * attempt);
    }
  }
}

module.exports = { getNvidiaEmbedding };
