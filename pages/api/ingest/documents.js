const supabase = require('../../../config/supabase');
const verifyAuth = require('../../../middleware/authHelper');

module.exports = async function handler(req, res) {
  const userSession = verifyAuth(req, res);
  if (!userSession) return; // verifyAuth handles 401 response

  if (req.method === 'GET') {
    // ── GET /api/ingest/documents: List distinct documents ──
    try {
      const { data, error } = await supabase
        .from('bonga_documents')
        .select('source_name, title, pillar, source_url');

      if (error) throw error;

      const docsMap = {};
      (data || []).forEach(row => {
        // Group by title if present to consolidate multi-page PDFs, otherwise fallback to source_name
        const key = row.title || row.source_name || 'Unknown Source';
        if (!docsMap[key]) {
          docsMap[key] = {
            source_name: key,
            title: row.title || 'Untitled',
            pillar: row.pillar || 'general',
            source_url: row.source_url || '#',
            chunks_count: 0
          };
        }
        docsMap[key].chunks_count++;
      });

      res.status(200).json({ success: true, documents: Object.values(docsMap) });
    } catch (err) {
      console.error('Error fetching documents:', err);
      res.status(500).json({ error: err.message });
    }
  } else if (req.method === 'DELETE') {
    // ── DELETE /api/ingest/documents: Delete all chunks of a document ──
    const { source_name } = req.body;

    if (!source_name) {
      return res.status(400).json({ error: 'source_name is required in request body.' });
    }

    try {
      // 1. Fetch one matching chunk to get the source_url for bucket cleanup
      const { data: chunksSample } = await supabase
        .from('bonga_documents')
        .select('source_url')
        .or(`title.eq."${source_name}",source_name.eq."${source_name}"`)
        .limit(1);

      if (chunksSample && chunksSample.length > 0) {
        const sourceUrl = chunksSample[0].source_url;
        if (sourceUrl && sourceUrl !== '#' && sourceUrl.includes('/storage/v1/object/public/bonga-documents/')) {
          const parts = sourceUrl.split('/storage/v1/object/public/bonga-documents/');
          if (parts.length > 1) {
            const storagePath = decodeURIComponent(parts[1]);
            console.log(`Deleting file from Supabase storage: ${storagePath}`);
            await supabase.storage.from('bonga-documents').remove([storagePath]);
          }
        }
      }

      // 2. Delete database chunks by title or source_name
      const { error: errorTitle } = await supabase
        .from('bonga_documents')
        .delete()
        .eq('title', source_name);

      const { error: errorSourceName } = await supabase
        .from('bonga_documents')
        .delete()
        .eq('source_name', source_name);

      if (errorTitle) throw errorTitle;
      if (errorSourceName) throw errorSourceName;

      res.status(200).json({ success: true, message: `Successfully deleted document: ${source_name}` });
    } catch (err) {
      console.error('Error deleting document:', err);
      res.status(500).json({ error: err.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'DELETE']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
