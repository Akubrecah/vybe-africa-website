const supabase = require('../../../config/supabase');
const { getNvidiaEmbedding } = require('../../../utils/nvidiaEmbeddings');

function chunkText(text, chunkSize = 400, overlap = 50) {
  const words = text.split(/\s+/);
  const chunks = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(' '));
    start += chunkSize - overlap;
  }
  return chunks.filter(c => c.split(/\s+/).length > 20); // drop tiny chunks
}

async function getEmbedding(text) {
  return await getNvidiaEmbedding(text, 'passage');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { text, title, pillar, source_name, source_url = '#' } = req.body;

  if (!text || !title || !pillar || !source_name) {
    return res.status(400).json({ error: 'Missing required parameters: text, title, pillar, source_name.' });
  }

  try {
    const chunks = chunkText(`${title}. ${text}`);
    console.log(`Starting custom ingestion for ${source_name}: ${chunks.length} chunks`);

    let inserted = 0;
    let skipped = 0;

    // Delete existing chunks for this source to prevent duplication on re-upload
    await supabase
      .from('bonga_documents')
      .delete()
      .eq('source_name', source_name);

    for (const chunk of chunks) {
      try {
        const embedding = await getEmbedding(chunk);

        const { error: insertError } = await supabase
          .from('bonga_documents')
          .insert({
            content:     chunk,
            embedding,
            source_url,
            source_name,
            pillar,
            title,
            updated_at:  new Date().toISOString(),
          });

        if (insertError) {
          console.error(`Error inserting chunk:`, insertError.message);
          skipped++;
        } else {
          inserted++;
        }

        // Slight rate limit spacing
        await sleep(150);
      } catch (chunkErr) {
        console.error(`Error processing chunk:`, chunkErr.message);
        skipped++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Ingestion completed. Inserted ${inserted} chunks, skipped ${skipped} chunks.`,
      chunks_count: chunks.length,
      inserted,
      skipped
    });

  } catch (err) {
    console.error('Ingestion text API error:', err);
    res.status(500).json({ error: err.message });
  }
};
