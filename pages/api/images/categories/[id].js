const supabase = require('../../../../config/supabase');
const verifyAuth = require('../../../../middleware/authHelper');

module.exports = async function handler(req, res) {
  const { id } = req.query;

  const userSession = verifyAuth(req, res);
  if (!userSession) return; // verifyAuth handles 401 response

  if (req.method === 'PUT') {
    // PUT /api/images/categories/:id - Update category (staff)
    try {
      const { name, slug, display_name, icon, description, display_order, is_active } = req.body;
      
      const { data, error } = await supabase
        .from('image_categories')
        .update({ name, slug, display_name, icon, description, display_order, is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Category not found' });
      
      res.json(data);
    } catch (err) {
      console.error('Error updating category:', err);
      res.status(500).json({ error: 'Failed to update category' });
    }
  } else if (req.method === 'DELETE') {
    // DELETE /api/images/categories/:id - Delete category (staff)
    try {
      const { error } = await supabase
        .from('image_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      res.json({ message: 'Category deleted' });
    } catch (err) {
      console.error('Error deleting category:', err);
      res.status(500).json({ error: 'Failed to delete category' });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
