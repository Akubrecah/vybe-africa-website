/**
 * routes/ingest.js
 * POST /api/ingest   (protected by INGEST_SECRET header)
 *
 * Fetches content from authoritative sources, chunks it,
 * embeds with Gemini, and upserts into Supabase pgvector.
 *
 * Sources per pillar:
 *  srhr:             UNICEF Kenya, UNFPA Kenya, WHO Kenya
 *  climate:          UNEP Kenya, Kenya Red Cross, NEMA
 *  child_protection: UNICEF Child Protection, Save the Children Kenya
 *  governance:       UN Women Kenya, UNDP Kenya, IEBC
 */

const express   = require('express');
const router    = express.Router();
const https     = require('https');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const supabase  = require('../config/supabase');

// text-embedding-004 requires API version v1 (not v1beta which is the SDK default)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY, { apiVersion: 'v1' });

// ── Data Sources ──────────────────────────────────────────────────────────────
const SOURCES = [
  // SRHR
  {
    pillar:      'srhr',
    source_name: 'UNICEF Kenya',
    source_url:  'https://www.unicef.org/kenya/reports',
    feed_url:    'https://www.unicef.org/kenya/rss.xml',
    type:        'rss',
  },
  {
    pillar:      'srhr',
    source_name: 'UNFPA Kenya',
    source_url:  'https://kenya.unfpa.org/',
    feed_url:    'https://kenya.unfpa.org/en/rss.xml',
    type:        'rss',
  },
  // Climate
  {
    pillar:      'climate',
    source_name: 'Kenya Red Cross',
    source_url:  'https://www.redcross.or.ke/',
    feed_url:    'https://www.redcross.or.ke/feed/',
    type:        'rss',
  },
  {
    pillar:      'climate',
    source_name: 'UNEP Kenya',
    source_url:  'https://www.unep.org/regions/africa/regional-initiatives/kenya',
    feed_url:    'https://www.unep.org/rss.xml',
    type:        'rss',
  },
  // Child Protection
  {
    pillar:      'child_protection',
    source_name: 'UNICEF Kenya — Child Protection',
    source_url:  'https://www.unicef.org/kenya/child-protection',
    feed_url:    'https://www.unicef.org/kenya/rss.xml',
    type:        'rss',
  },
  {
    pillar:      'child_protection',
    source_name: 'Save the Children Kenya',
    source_url:  'https://kenya.savethechildren.net/',
    feed_url:    'https://kenya.savethechildren.net/rss.xml',
    type:        'rss',
  },
  // Governance
  {
    pillar:      'governance',
    source_name: 'UN Women Kenya',
    source_url:  'https://africa.unwomen.org/en/where-we-are/eastern-and-southern-africa/kenya',
    feed_url:    'https://www.unwomen.org/en/rss',
    type:        'rss',
  },
  {
    pillar:      'governance',
    source_name: 'UNDP Kenya',
    source_url:  'https://www.undp.org/kenya',
    feed_url:    'https://www.undp.org/kenya/rss.xml',
    type:        'rss',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Fetch URL content as text */
function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Bonga-na-Vybe-Bot/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/** Naive RSS XML → array of { title, content } */
function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title   = (/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(block) || /<title>(.*?)<\/title>/.exec(block) || [])[1] || '';
    const desc    = (/<description><!\[CDATA\[(.*?)\]\]><\/description>/.exec(block) || /<description>(.*?)<\/description>/.exec(block) || [])[1] || '';
    // Strip HTML tags from description
    const clean = desc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (clean.length > 80) items.push({ title: title.trim(), content: clean });
  }
  return items;
}

/** Split text into ~400-token chunks with 50-token overlap */
function chunkText(text, chunkSize = 400, overlap = 50) {
  const words  = text.split(/\s+/);
  const chunks = [];
  let start    = 0;
  while (start < words.length) {
    const end  = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(' '));
    start += chunkSize - overlap;
  }
  return chunks.filter(c => c.split(/\s+/).length > 20); // drop tiny chunks
}

/** Embed text with Gemini text-embedding-004 (requires API v1) */
async function embed(text) {
  const model  = genAI.getGenerativeModel({ model: 'text-embedding-004' }, { apiVersion: 'v1' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/** Sleep helper for rate-limit backoff */
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Main ingest function ──────────────────────────────────────────────────────
async function ingestSource(source, log) {
  log(`  Fetching ${source.source_name}...`);
  let items = [];

  try {
    const xml = await fetchText(source.feed_url);
    items = parseRSS(xml);
    log(`    Parsed ${items.length} RSS items`);
  } catch (err) {
    log(`    ⚠ Fetch failed: ${err.message}`);
    return { source: source.source_name, inserted: 0, skipped: 0, error: err.message };
  }

  let inserted = 0, skipped = 0;

  for (const item of items.slice(0, 20)) { // cap at 20 per source per run
    const chunks = chunkText(`${item.title}. ${item.content}`);

    for (const chunk of chunks) {
      try {
        const embedding = await embed(chunk);

        const { error } = await supabase
          .from('bonga_documents')
          .upsert({
            content:     chunk,
            embedding,
            source_url:  source.source_url,
            source_name: source.source_name,
            pillar:      source.pillar,
            title:       item.title,
            updated_at:  new Date().toISOString(),
          });

        if (error) { skipped++; log(`    ✗ DB error: ${error.message}`); }
        else        { inserted++; }

        await sleep(200); // 200ms between embeds to avoid rate limits
      } catch (e) {
        skipped++;
        log(`    ✗ Embed error: ${e.message}`);
      }
    }
  }

  log(`    ✓ ${source.source_name}: ${inserted} inserted, ${skipped} skipped`);
  return { source: source.source_name, inserted, skipped };
}

// ── GET /api/ingest/documents ───────────────────────────────────────────────
// Lists distinct source documents and chunk counts
router.get('/documents', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bonga_documents')
      .select('source_name, title, pillar, source_url');

    if (error) throw error;

    const docsMap = {};
    (data || []).forEach(row => {
      const key = row.source_name || row.title || 'Unknown Source';
      if (!docsMap[key]) {
        docsMap[key] = {
          source_name: row.source_name || 'Unknown Source',
          title: row.title || 'Untitled',
          pillar: row.pillar || 'General',
          source_url: row.source_url || '#',
          chunks_count: 0
        };
      }
      docsMap[key].chunks_count++;
    });

    res.json({ success: true, documents: Object.values(docsMap) });
  } catch (err) {
    console.error('Error fetching documents:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/ingest/documents ────────────────────────────────────────────
// Deletes all document chunks matching source_name
router.delete('/documents', async (req, res) => {
  const { source_name } = req.body;

  if (!source_name) {
    return res.status(400).json({ error: 'source_name is required in request body.' });
  }

  try {
    const { error } = await supabase
      .from('bonga_documents')
      .delete()
      .eq('source_name', source_name);

    if (error) throw error;

    res.json({ success: true, message: `Successfully deleted document: ${source_name}` });
  } catch (err) {
    console.error('Error deleting document:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ingest/text ──────────────────────────────────────────────────
// Receives client-side parsed text, chunks, embeds, and uploads it
router.post('/text', async (req, res) => {
  const { text, title, pillar, source_name, source_url = '#' } = req.body;

  if (!text || !title || !pillar || !source_name) {
    return res.status(400).json({ error: 'Missing required parameters: text, title, pillar, source_name.' });
  }

  try {
    const chunks = chunkText(`${title}. ${text}`);
    console.log(`Starting custom ingestion for ${source_name}: ${chunks.length} chunks`);

    let inserted = 0;
    let skipped = 0;

    for (const chunk of chunks) {
      try {
        const embedding = await embed(chunk);

        const { error } = await supabase
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

        if (error) {
          skipped++;
          console.error(`DB Insert error: ${error.message}`);
        } else {
          inserted++;
        }

        await sleep(150); // Small delay to avoid rate limit issues
      } catch (e) {
        skipped++;
        console.error(`Embedding chunk failed: ${e.message}`);
      }
    }

    res.json({ success: true, total_chunks: chunks.length, inserted, skipped });
  } catch (err) {
    console.error('Error ingesting custom text:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Route ─────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  // Simple secret protection
  const secret = req.headers['x-ingest-secret'];
  if (secret !== process.env.INGEST_SECRET) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const { pillar = null } = req.body; // optional: ingest only one pillar
  const sources = pillar ? SOURCES.filter(s => s.pillar === pillar) : SOURCES;

  const logs    = [];
  const results = [];
  const log     = msg => { logs.push(msg); console.log(msg); };

  log(`\n🔄 Bonga na Vybe — Ingest started (${new Date().toISOString()})`);
  log(`   Sources to process: ${sources.length}`);

  for (const source of sources) {
    const result = await ingestSource(source, log);
    results.push(result);
  }

  const total = results.reduce((a, r) => a + (r.inserted || 0), 0);
  log(`\n✅ Ingest complete — ${total} chunks inserted`);

  res.json({ success: true, total_inserted: total, results, logs });
});

module.exports = router;
