const supabase = require('../../../config/supabase');
const verifyAuth = require('../../../middleware/authHelper');
const axios = require('axios');
const cheerio = require('cheerio');
const { getNvidiaEmbedding } = require('../../../utils/nvidiaEmbeddings');

function chunkText(text, chunkSize = 350, overlap = 50) {
  const words = text.split(/\s+/);
  const chunks = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(' '));
    start += chunkSize - overlap;
  }
  return chunks.filter(c => c.split(/\s+/).length > 20); // Drop tiny chunks
}

async function getEmbedding(text) {
  return await getNvidiaEmbedding(text, 'passage');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function scrapePage(url) {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Bonga-na-Vybe-Bot/1.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    },
    timeout: 12000
  });

  const $ = cheerio.load(response.data);
  
  // Remove boilerplate and interactive sections
  $('script, style, nav, footer, header, iframe, noscript, svg, form, select, option').remove();

  const title = $('title').text() || $('h1').first().text() || 'Web Article';
  const bodyText = $('body').text();
  const cleanText = bodyText.replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();

  return {
    title: title.trim(),
    content: cleanText
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // ── Authenticate: Allow either INGEST_SECRET header OR standard JWT session ──
  const secretHeader = req.headers['x-ingest-secret'];
  const isSecretValid = secretHeader && secretHeader === process.env.INGEST_SECRET;

  let isAuthenticated = isSecretValid;
  if (!isAuthenticated) {
    // Attempt JWT validation if secret header was not provided
    const userSession = verifyAuth(req, res);
    if (userSession) {
      isAuthenticated = true;
    } else {
      // verifyAuth already sent a 401 response, so we just return
      return;
    }
  }

  const { pillar = null } = req.body; // optional: crawl only one pillar

  try {
    // 1. Fetch crawler target URLs from bonga_web_sources
    let query = supabase.from('bonga_web_sources').select('*');
    if (pillar) {
      query = query.eq('pillar', pillar);
    }
    const { data: webSources, error: dbError } = await query;

    if (dbError) throw dbError;

    if (!webSources || webSources.length === 0) {
      return res.status(200).json({ success: true, message: 'No target web sources found to process.', total_inserted: 0 });
    }

    const results = [];
    let totalInserted = 0;

    // 2. Loop through and process each URL
    for (const source of webSources) {
      console.log(`Web Ingest: Fetching ${source.name} (${source.url})`);
      
      try {
        const scraped = await scrapePage(source.url);
        
        // Remove existing chunks for this specific URL before importing new content to prevent duplicates
        await supabase
          .from('bonga_documents')
          .delete()
          .eq('source_url', source.url);

        const chunks = chunkText(`${scraped.title}. ${scraped.content}`);
        let insertedForSource = 0;
        let skippedForSource = 0;

        for (const chunk of chunks) {
          try {
            const embedding = await getEmbedding(chunk);

            const { error: insertError } = await supabase
              .from('bonga_documents')
              .insert({
                content:     chunk,
                embedding,
                source_url:  source.url,
                source_name: source.name,
                pillar:      source.pillar,
                title:       scraped.title,
                updated_at:  new Date().toISOString(),
              });

            if (insertError) {
              console.error(`DB Ingest Error for ${source.name}:`, insertError.message);
              skippedForSource++;
            } else {
              insertedForSource++;
              totalInserted++;
            }

            await sleep(150); // Delay between embeds to avoid Google API rate limits
          } catch (embedErr) {
            console.error(`Embedding failed for chunk in ${source.name}:`, embedErr.message);
            skippedForSource++;
          }
        }

        results.push({
          source: source.name,
          url: source.url,
          chunks_scraped: chunks.length,
          inserted: insertedForSource,
          skipped: skippedForSource
        });

      } catch (scrapeErr) {
        console.error(`Failed crawling URL: ${source.url}`, scrapeErr.message);
        results.push({
          source: source.name,
          url: source.url,
          error: scrapeErr.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      total_inserted: totalInserted,
      results
    });

  } catch (err) {
    console.error('Crawler API error:', err);
    return res.status(500).json({ error: err.message || 'Something went wrong during web crawling.' });
  }
}
