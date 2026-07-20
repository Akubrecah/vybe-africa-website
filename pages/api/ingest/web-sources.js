const supabase = require('../../../config/supabase');
const verifyAuth = require('../../../middleware/authHelper');

module.exports = async function handler(req, res) {
  const userSession = verifyAuth(req, res);
  if (!userSession) return; // verifyAuth handles 401 response

  if (req.method === 'GET') {
    // GET /api/ingest/web-sources - Get all sources
    try {
      const { data, error } = await supabase
        .from('bonga_web_sources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.status(200).json(data || []);
    } catch (err) {
      console.error('Error fetching web sources:', err);
      res.status(500).json({ error: err.message });
    }
  } else if (req.method === 'POST') {
    // POST /api/ingest/web-sources - Add web source
    const { url, name, pillar } = req.body;

    if (!url || !name || !pillar) {
      return res.status(400).json({ error: 'Missing required parameters: url, name, pillar.' });
    }

    try {
      const { data, error } = await supabase
        .from('bonga_web_sources')
        .insert([{ url, name, pillar }])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (err) {
      console.error('Error adding web source:', err);
      if (err.code === '23505') {
        return res.status(400).json({ error: 'This URL is already registered as a source.' });
      }
      res.status(500).json({ error: err.message });
    }
  } else if (req.method === 'DELETE') {
    // DELETE /api/ingest/web-sources?id=xxx - Remove web source
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Missing required parameter: id.' });
    }

    try {
      const { error } = await supabase
        .from('bonga_web_sources')
        .delete()
        .eq('id', id);

      if (error) throw error;
      res.status(200).json({ success: true, message: 'Web source deleted successfully' });
    } catch (err) {
      console.error('Error deleting web source:', err);
      res.status(500).json({ error: err.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
