const supabase = require('../../../config/supabase');
const verifyAuth = require('../../../middleware/authHelper');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    // GET /api/posts: Get all posts
    try {
      const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      res.json(posts);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  } else if (req.method === 'POST') {
    // POST /api/posts: Create a post (Staff only)
    const userSession = verifyAuth(req, res);
    if (!userSession) return; // verifyAuth handles writing 401 response

    try {
      // Get Author Name
      const { data: user } = await supabase
        .from('users')
        .select('name')
        .eq('id', userSession.id)
        .single();
      
      const { title, content, category } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: 'Title and Content are required.' });
      }

      const { data: post, error } = await supabase
        .from('posts')
        .insert([{
          title,
          content,
          category,
          author: userSession.id,
          author_name: user ? user.name : 'Unknown'
        }])
        .select();

      if (error) throw error;
      res.json(post[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
