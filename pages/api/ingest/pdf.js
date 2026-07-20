const supabase = require('../../../config/supabase');
const verifyAuth = require('../../../middleware/authHelper');
const formidable = require('formidable');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { getNvidiaEmbedding } = require('../../../utils/nvidiaEmbeddings');

module.exports.config = {
  api: {
    bodyParser: false, // Disables standard body parsing so formidable can parse multipart uploads
  },
};

function chunkText(text, chunkSize = 350, overlap = 50) {
  const words = text.split(/\s+/);
  const chunks = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(' '));
    start += chunkSize - overlap;
  }
  return chunks.filter(c => c.split(/\s+/).length > 15); // Drop tiny chunks
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

  const userSession = verifyAuth(req, res);
  if (!userSession) return; // verifyAuth handles 401 response

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('PDF form parsing failed:', err);
      return res.status(400).json({ error: 'Failed to process file upload.' });
    }

    const file = files.pdf;
    if (!file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    const fileObj = Array.isArray(file) ? file[0] : file;
    const getFieldVal = (val) => Array.isArray(val) ? val[0] : val;
    const pillar = getFieldVal(fields.pillar);

    if (!pillar) {
      return res.status(400).json({ error: 'Pillar is required.' });
    }

    const sourceName = fileObj.originalFilename || 'document.pdf';
    const filePath = fileObj.filepath;

    try {
      const dataBuffer = fs.readFileSync(filePath);

      // --- 1. Upload original PDF to Supabase Storage Bucket ---
      const timestamp = Date.now();
      const cleanFilename = sourceName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const storagePath = `${pillar}/${timestamp}-${cleanFilename}`;

      // Ensure storage bucket exists
      try {
        await supabase.storage.createBucket('bonga-documents', {
          public: true,
          fileSizeLimit: 52428800 // 50MB
        });
      } catch (bucketErr) {
        console.warn('Bucket creation warning (probably already exists):', bucketErr.message);
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('bonga-documents')
        .upload(storagePath, dataBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        console.error('Supabase storage upload error:', uploadError.message);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('bonga-documents')
        .getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      // Parse PDF page-by-page by gathering text in render_page callback
      let pages = [];
      const render_page = (pageData) => {
        return pageData.getTextContent()
          .then((textContent) => {
            let lastY, text = '';
            for (let item of textContent.items) {
              if (lastY === item.transform[5] || !lastY) {
                text += item.str;
              } else {
                text += '\n' + item.str;
              }
              lastY = item.transform[5];
            }
            pages.push({ pageNum: pageData.pageIndex + 1, text: text });
            return text;
          });
      };

      // Extract text
      await pdfParse(dataBuffer, { pagerender: render_page });

      // Clean pages text sorting (pdfParse finishes asynchronously)
      pages.sort((a, b) => a.pageNum - b.pageNum);

      let inserted = 0;
      let skipped = 0;
      let totalChunksCount = 0;

      // Ingest page-by-page
      for (const page of pages) {
        const cleanText = page.text.replace(/\s+/g, ' ').trim();
        if (cleanText.length < 50) continue; // Skip near-empty pages

        const chunks = chunkText(cleanText);
        totalChunksCount += chunks.length;

        for (const chunk of chunks) {
          try {
            // Get 768 embedding
            const embedding = await getEmbedding(chunk);

            // Upsert into Supabase RAG table
            // We append page number to source_name for clean citation UI output (e.g. "manual.pdf (p. 4)")
            const { error: dbError } = await supabase
              .from('bonga_documents')
              .insert({
                content:     chunk,
                embedding,
                source_url:  publicUrl,
                source_name: `${sourceName} (p. ${page.pageNum})`,
                pillar,
                title:       sourceName,
                updated_at:  new Date().toISOString(),
              });

            if (dbError) {
              console.error('Supabase DB Insert error:', dbError.message);
              skipped++;
            } else {
              inserted++;
            }

            // Rate-limiting delay for Gemini embedding endpoint
            await sleep(150);
          } catch (embedErr) {
            console.error('Embedding parse failure:', embedErr.message);
            skipped++;
          }
        }
      }

      // Cleanup temp uploaded file
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkErr) {
        console.warn('Failed to clean temporary file:', unlinkErr.message);
      }

      res.status(200).json({
        success: true,
        source_name: sourceName,
        total_pages: pages.length,
        total_chunks: totalChunksCount,
        inserted,
        skipped
      });

    } catch (parseErr) {
      console.error('PDF ingestion failed:', parseErr);
      res.status(500).json({ error: parseErr.message || 'Failed to ingest PDF document.' });
    }
  });
}
