const supabase = require('../../../../config/supabase');
const verifyAuth = require('../../../../middleware/authHelper');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    // GET /api/images/categories - Get all categories
    try {
      const { data, error } = await supabase
        .from('image_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      res.json(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  } else if (req.method === 'POST') {
    // POST /api/images/categories - Create category (staff only)
    const userSession = verifyAuth(req, res);
    if (!userSession) return; // verifyAuth handles 401 response

    try {
      const { name, slug, display_name, icon, description, display_order } = req.body;
      
      if (!name || !slug) {
        return res.status(400).json({ error: 'Name and slug are required' });
      }

      const { data, error } = await supabase
        .from('image_categories')
        .insert([{ name, slug, display_name, icon, description, display_order }])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (err) {
      console.error('Error creating category:', err);
      if (err.code === '23505') {
        return res.status(400).json({ error: 'Category name or slug already exists' });
      }
      res.status(500).json({ error: 'Failed to create category' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
