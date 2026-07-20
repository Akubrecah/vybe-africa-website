const supabase = require('../../../config/supabase');
const verifyAuth = require('../../../middleware/authHelper');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const userSession = verifyAuth(req, res);
  if (!userSession) return; // verifyAuth handles writing 401 response

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, designation, phone, bio')
      .eq('id', userSession.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('GET ME ERROR:', err);
    res.status(500).send('Server error');
  }
}
